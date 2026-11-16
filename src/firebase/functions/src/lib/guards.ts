import { CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { db } from "./admin";

export interface Caller {
  uid: string;
  email: string;
}

export function assertSignedIn(req: CallableRequest<unknown>): Caller {
  if (!req.auth) throw new HttpsError("unauthenticated", "Cần đăng nhập.");
  return { uid: req.auth.uid, email: String(req.auth.token.email ?? req.auth.uid) };
}

/**
 * Admin = claim `role=admin` TRONG token VÀ hồ sơ Firestore hiện tại vẫn là admin, chưa bị khóa.
 * Claim trong ID token còn hiệu lực tới ~1 giờ sau khi bị hạ quyền / khóa, nên phải đối chiếu Firestore.
 */
export async function assertAdmin(req: CallableRequest<unknown>): Promise<Caller> {
  const caller = assertSignedIn(req);
  if (req.auth?.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Chỉ Admin được thực hiện thao tác này.");
  }
  const snap = await db.doc(`users/${caller.uid}`).get();
  if (!snap.exists || snap.get("role") !== "admin" || snap.get("disabled") === true) {
    throw new HttpsError("permission-denied", "Quyền Admin của tài khoản đã bị thu hồi.");
  }
  return caller;
}
