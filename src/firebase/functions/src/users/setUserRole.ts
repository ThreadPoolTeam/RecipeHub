import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { REGION, Role } from "../config";
import { auth, db } from "../lib/admin";
import { assertAdmin } from "../lib/guards";
import { bumpSummary } from "../lib/stats";
import { asObject, requireEnum, requireUid } from "../lib/validate";

export async function setUserRoleHandler(callerUid: string, data: unknown): Promise<{ ok: true; role: Role }> {
  const o = asObject(data);
  const uid = requireUid(o, "uid", "uid");
  const role = requireEnum(o, "role", ["viewer", "admin"] as const, "Vai trò");
  if (uid === callerUid && role !== "admin") {
    throw new HttpsError("failed-precondition", "Không thể tự hạ quyền của chính mình.");
  }
  const ref = db.doc(`users/${uid}`);
  // Đọc + ghi + bộ đếm trong một transaction: 2 Admin bấm cùng lúc không làm adminUsers tăng 2.
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Không tìm thấy người dùng.");
    if (snap.get("isAnonymous") === true && role === "admin") {
      throw new HttpsError("failed-precondition", "Tài khoản khách không thể làm Admin.");
    }
    const previous = snap.get("role") as Role;
    tx.update(ref, { role, claimsUpdatedAt: FieldValue.serverTimestamp() });
    if (previous !== role) await bumpSummary({ adminUsers: role === "admin" ? 1 : -1 }, tx);
  });
  const current = (await auth.getUser(uid)).customClaims ?? {};
  await auth.setCustomUserClaims(uid, { ...current, role });
  return { ok: true, role };
}

export const setUserRole = onCall({ region: REGION }, async (req) => {
  const caller = await assertAdmin(req);
  return setUserRoleHandler(caller.uid, req.data);
});
