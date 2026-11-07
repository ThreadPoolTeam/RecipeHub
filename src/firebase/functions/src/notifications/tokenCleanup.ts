import { db } from "../lib/admin";

const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);
// Không tính "messaging/invalid-argument": mã này cũng trả về khi payload sai → sẽ xóa nhầm mọi thiết bị.

export function isDeadTokenError(code: string | undefined): boolean {
  return code !== undefined && DEAD_TOKEN_CODES.has(code);
}

/** Xóa các thiết bị có token đã chết (app gỡ cài đặt, token hết hạn). */
export async function removeDeadTokens(uid: string, deviceIds: string[]): Promise<void> {
  if (deviceIds.length === 0) return;
  const batch = db.batch();
  for (const id of deviceIds) batch.delete(db.doc(`users/${uid}/devices/${id}`));
  await batch.commit();
}
