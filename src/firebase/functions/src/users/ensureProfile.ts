import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";
import { ADMIN_EMAILS, REGION, Role } from "../config";
import { auth, db } from "../lib/admin";
import { assertSignedIn } from "../lib/guards";
import { provisionUser } from "./provision";

export interface EnsureProfileResult {
  role: Role;
  disabled: boolean;
  /** true nếu claim trong token client khác Firestore → client cần getIdToken(true). */
  refreshToken: boolean;
}

/**
 * Gọi sau mỗi lần đăng nhập (mobile + web).
 * - User có từ trước khi deploy trigger: tạo hồ sơ + claim.
 * - Claim lệch với Firestore: đặt lại claim theo Firestore (giữ các claim khác).
 * - Cập nhật email / isAnonymous khi khách liên kết Google.
 */
export async function ensureProfileHandler(
  uid: string,
  tokenRole: unknown,
  adminEmailsRaw: string,
): Promise<EnsureProfileResult> {
  const user = await auth.getUser(uid);
  const role = await provisionUser(
    {
      uid,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      photoURL: user.photoURL,
      isAnonymous: user.providerData.length === 0,
      disabled: user.disabled,
    },
    adminEmailsRaw,
  );
  const ref = db.doc(`users/${uid}`);
  const snap = await ref.get();
  const refreshToken = tokenRole !== role;
  const update: Record<string, unknown> = { lastSeenAt: FieldValue.serverTimestamp() };
  if (refreshToken) update.claimsUpdatedAt = FieldValue.serverTimestamp();
  await ref.update(update);
  return { role, disabled: snap.get("disabled") === true, refreshToken };
}

export const ensureProfile = onCall({ region: REGION }, async (req) => {
  const caller = assertSignedIn(req);
  return ensureProfileHandler(caller.uid, req.auth?.token.role, ADMIN_EMAILS.value());
});
