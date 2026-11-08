import { FieldValue, Transaction } from "firebase-admin/firestore";
import { db } from "./admin";
import { TIME_ZONE } from "../config";

export const summaryRef = () => db.doc("stats/summary");
export const dayRef = (day: string) => db.doc(`stats/incidents/days/${day}`);
/** Đánh dấu event đã xử lý – trigger được giao "ít nhất một lần", phải chống đếm trùng. */
export const eventMarkerRef = (eventId: string) => db.doc(`stats/events/handled/${eventId}`);

/** yyyy-MM-dd theo giờ Việt Nam. */
export function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(date);
}

/** Tên dùng được làm khóa map Firestore (không chứa . / ` [ ] * ~). Dấu chấm → ",", web đổi lại. */
export function mapKey(raw: unknown, fallback = "unknown"): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  const cleaned = s.replace(/\./g, ",").replace(/[/`[\]*~]/g, "_").slice(0, 40);
  return cleaned.length > 0 ? cleaned : fallback;
}

export function summaryIncrements(fields: Record<string, number>): Record<string, unknown> {
  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  for (const [k, v] of Object.entries(fields)) if (v !== 0) update[k] = FieldValue.increment(v);
  return update;
}

export async function bumpSummary(fields: Record<string, number>, tx?: Transaction): Promise<void> {
  const update = summaryIncrements(fields);
  if (tx) tx.set(summaryRef(), update, { merge: true });
  else await summaryRef().set(update, { merge: true });
}

/**
 * Chạy [work] đúng một lần cho mỗi eventId (trong transaction). Trả false nếu event đã xử lý trước đó.
 * Marker tự hết hạn nếu bật TTL policy cho field `expireAt` (không bắt buộc).
 */
export async function onceForEvent(eventId: string, work: (tx: Transaction) => Promise<void> | void): Promise<boolean> {
  const marker = eventMarkerRef(eventId);
  return db.runTransaction(async (tx) => {
    if ((await tx.get(marker)).exists) return false;
    await work(tx);
    tx.set(marker, { at: FieldValue.serverTimestamp(), expireAt: new Date(Date.now() + 7 * 24 * 3600 * 1000) });
    return true;
  });
}
