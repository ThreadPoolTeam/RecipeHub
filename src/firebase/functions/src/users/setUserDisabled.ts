import { HttpsError, onCall } from "firebase-functions/v2/https";
import { REGION, TOPIC_ALL } from "../config";
import { auth, db, messaging } from "../lib/admin";
import { assertAdmin } from "../lib/guards";
import { bumpSummary } from "../lib/stats";
import { asObject, requireBoolean, requireUid } from "../lib/validate";

export async function setUserDisabledHandler(callerUid: string, data: unknown): Promise<{ ok: true; disabled: boolean }> {
  const o = asObject(data);
  const uid = requireUid(o, "uid", "uid");
  const disabled = requireBoolean(o, "disabled", "Trạng thái khóa");
  if (uid === callerUid) throw new HttpsError("failed-precondition", "Không thể tự khóa tài khoản của mình.");
  const ref = db.doc(`users/${uid}`);
  if (!(await ref.get()).exists) throw new HttpsError("not-found", "Không tìm thấy người dùng.");

  await auth.updateUser(uid, { disabled });
  if (disabled) {
    await auth.revokeRefreshTokens(uid);
    const devices = await ref.collection("devices").get();
    const tokens = devices.docs.map((d) => String(d.get("token") ?? "")).filter((t) => t.length > 0);
    try {
      await messaging().unsubscribe(tokens, TOPIC_ALL);
    } catch (e) {
      console.warn("unsubscribe failed", e);
    }
  }
  // App nghe field này để đăng xuất ngay. Bộ đếm cùng transaction để bấm đúp không đếm 2 lần.
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const previous = snap.get("disabled") === true;
    tx.update(ref, { disabled });
    if (previous !== disabled) await bumpSummary({ disabledUsers: disabled ? 1 : -1 }, tx);
  });
  return { ok: true, disabled };
}

export const setUserDisabled = onCall({ region: REGION }, async (req) => {
  const caller = await assertAdmin(req);
  return setUserDisabledHandler(caller.uid, req.data);
});
