import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { REGION } from "../config";
import { db } from "../lib/admin";

/**
 * Thiết bị thêm / sửa / xóa:
 * - Một FCM token chỉ thuộc một người: máy dùng chung (A đăng xuất offline, B đăng nhập) thì xóa bản của A,
 *   tránh thông báo riêng của A hiện trên máy B.
 * - Đếm lại users/{uid}.deviceCount để web hiển thị.
 */
export async function syncDevice(uid: string, deviceId: string, token: string | null): Promise<void> {
  if (token) {
    const dupes = await db.collectionGroup("devices").where("token", "==", token).get();
    const batch = db.batch();
    let n = 0;
    for (const d of dupes.docs) {
      const owner = d.ref.parent.parent?.id;
      if (owner && owner !== uid) {
        batch.delete(d.ref);
        n++;
      }
    }
    if (n > 0) await batch.commit();
  }
  const userRef = db.doc(`users/${uid}`);
  const user = await userRef.get();
  if (!user.exists) return;
  const count = (await userRef.collection("devices").count().get()).data().count;
  if (user.get("deviceCount") !== count) await userRef.update({ deviceCount: count });
  void deviceId;
}

export const onDeviceWritten = onDocumentWritten(
  { document: "users/{uid}/devices/{deviceId}", region: REGION },
  async (event) => {
    const after = event.data?.after;
    const created = !event.data?.before.exists && after?.exists;
    const token = created ? String(after?.get("token") ?? "") : null;
    await syncDevice(event.params.uid, event.params.deviceId, token || null);
  },
);
