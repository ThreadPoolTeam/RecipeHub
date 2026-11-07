import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { bumpSummary, dayKey, dayRef, mapKey, onceForEvent } from "../lib/stats";

export type IncidentKind = "fatal" | "non_fatal" | "crashlytics_issue";

const KIND_FIELD: Record<IncidentKind, string> = {
  fatal: "fatal",
  non_fatal: "nonFatal",
  crashlytics_issue: "crashlytics",
};

/** Phiên bản dạng 1.2.3[+4]; giá trị lạ gom vào "other" để map thống kê không phình vô hạn. */
export function versionKey(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  return /^[0-9]{1,4}(\.[0-9]{1,4}){1,3}(\+[0-9]{1,6})?$/.test(s) ? mapKey(s) : "other";
}

/** Model máy: chỉ chữ, số, khoảng trắng, -, _ (≤ 40 ký tự); còn lại → "other". */
export function modelKey(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  return /^[A-Za-z0-9 _-]{1,40}$/.test(s) ? s : s.length === 0 ? "unknown" : "other";
}

/**
 * Cộng bộ đếm ngày + tổng cho sự cố mới, đúng một lần cho mỗi [eventId] và trong cùng transaction.
 * Trả về khóa ngày, hoặc null nếu event đã được xử lý.
 */
export async function countNewIncident(d: FirebaseFirestore.DocumentData, eventId: string): Promise<string | null> {
  const when = d.reportedAt instanceof Timestamp ? d.reportedAt.toDate() : new Date();
  const day = dayKey(when);
  const kind: IncidentKind = (d.kind as string) in KIND_FIELD ? (d.kind as IncidentKind) : "non_fatal";
  const done = await onceForEvent(eventId, async (tx) => {
    tx.set(
      dayRef(day),
      {
        day,
        total: FieldValue.increment(1),
        [KIND_FIELD[kind]]: FieldValue.increment(1),
        byVersion: { [versionKey(d.appVersion)]: FieldValue.increment(1) },
        byModel: { [modelKey(d.deviceModel)]: FieldValue.increment(1) },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await bumpSummary({ totalIncidents: 1, openIncidents: d.status === "open" ? 1 : 0 }, tx);
  });
  return done ? day : null;
}

/** Thay đổi của bộ đếm openIncidents khi trạng thái đổi. */
export function openDelta(before: unknown, after: unknown): number {
  if (before === after) return 0;
  if (before === "open") return -1;
  if (after === "open") return 1;
  return 0;
}

export async function countStatusChange(before: unknown, after: unknown, eventId: string): Promise<boolean> {
  const delta = openDelta(before, after);
  if (delta === 0) return false;
  return onceForEvent(eventId, async (tx) => bumpSummary({ openIncidents: delta }, tx));
}

/** Sự cố bị xóa (Console / Admin SDK) khi còn mở → giảm openIncidents, totalIncidents. */
export async function countDeleted(d: FirebaseFirestore.DocumentData, eventId: string): Promise<boolean> {
  return onceForEvent(eventId, async (tx) =>
    bumpSummary({ totalIncidents: -1, openIncidents: d.status === "open" ? -1 : 0 }, tx),
  );
}
