import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { REGION, TOPIC_ALL } from "../config";
import { db, messaging } from "../lib/admin";
import { assertAdmin, Caller } from "../lib/guards";
import { bumpSummary } from "../lib/stats";
import { asObject, optionalString, requireEnum, requireString, requireUid } from "../lib/validate";
import { isDeadTokenError, removeDeadTokens } from "./tokenCleanup";

export const ANDROID_CHANNEL_ID = "recipehub_default";
export const MULTICAST_LIMIT = 500;

export interface SendResult {
  id: string;
  target: "all" | "user";
  successCount: number;
  failureCount: number;
}

/**
 * Admin gửi thông báo.
 * - target=all  → topic all_staff (FCM tự phát tới mọi máy đã subscribe).
 * - target=user → mọi token trong users/{uid}/devices.
 * Payload `data` giữ đúng định dạng app đang xử lý deep link: { type, target_id }.
 */
export async function sendNotificationHandler(caller: Caller, data: unknown): Promise<SendResult> {
  const o = asObject(data);
  const title = requireString(o, "title", 1, 65, "Tiêu đề");
  const body = requireString(o, "body", 1, 240, "Nội dung");
  const target = requireEnum(o, "target", ["all", "user"] as const, "Đối tượng");
  const targetUid = target === "user" ? requireUid(o, "targetUid", "Người nhận") : null;
  const d = o.data === undefined || o.data === null ? {} : asObject(o.data);
  const type = d.type === undefined ? "none" : requireEnum(d, "type", ["recipe", "none"] as const, "Loại đích");
  const targetId =
    type === "recipe" ? requireString(d, "targetId", 1, 40, "Mã món") : optionalString(d, "targetId", 40, "Mã đích");

  const message = {
    notification: { title, body },
    data: { type, target_id: targetId ?? "" },
    android: { priority: "high" as const, notification: { channelId: ANDROID_CHANNEL_ID, sound: "default" } },
  };

  let successCount = 0;
  let failureCount = 0;
  let error: string | null = null;

  if (target === "all") {
    try {
      await messaging().sendToTopic(TOPIC_ALL, message);
      successCount = 1;
    } catch (e) {
      failureCount = 1;
      error = e instanceof Error ? e.message : String(e);
    }
  } else {
    const userSnap = await db.doc(`users/${targetUid}`).get();
    if (!userSnap.exists) throw new HttpsError("not-found", "Không tìm thấy người nhận.");
    const devices = await db.collection(`users/${targetUid}/devices`).get();
    const entries = devices.docs
      .map((doc) => ({ id: doc.id, token: String(doc.get("token") ?? "") }))
      .filter((e) => e.token.length > 0);
    if (entries.length === 0) {
      throw new HttpsError("failed-precondition", "Người nhận chưa có thiết bị nào đăng ký nhận thông báo.");
    }
    // FCM multicast tối đa 500 token mỗi lần.
    const dead: string[] = [];
    for (let start = 0; start < entries.length; start += MULTICAST_LIMIT) {
      const chunk = entries.slice(start, start + MULTICAST_LIMIT);
      const res = await messaging().sendToTokens(
        chunk.map((e) => e.token),
        message,
      );
      successCount += res.successCount;
      failureCount += res.failureCount;
      res.responses.forEach((r, i) => {
        if (!r.success) {
          if (isDeadTokenError(r.error?.code)) dead.push(chunk[i].id);
          error = error ?? r.error?.message ?? "unknown";
        }
      });
    }
    await removeDeadTokens(targetUid as string, dead);
  }

  const ref = await db.collection("notifications").add({
    title,
    body,
    target,
    targetUid,
    data: { type, targetId: targetId ?? null },
    sentBy: caller.email,
    sentAt: FieldValue.serverTimestamp(),
    successCount,
    failureCount,
    error,
  });
  await bumpSummary({ notificationsSent: successCount > 0 ? 1 : 0, notificationsFailed: successCount > 0 ? 0 : 1 });
  if (target === "all" && failureCount > 0) {
    throw new HttpsError("internal", `Gửi thất bại: ${error}`);
  }
  return { id: ref.id, target, successCount, failureCount };
}

export const sendNotification = onCall({ region: REGION }, async (req) => {
  const caller = await assertAdmin(req);
  return sendNotificationHandler(caller, req.data);
});
