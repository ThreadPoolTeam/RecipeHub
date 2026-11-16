import { FieldValue } from "firebase-admin/firestore";
import { onNewFatalIssuePublished } from "firebase-functions/v2/alerts/crashlytics";
import { REGION } from "../config";
import { db } from "../lib/admin";

export interface CrashlyticsIssueLike {
  id?: string;
  title?: string;
  subtitle?: string;
  appVersion?: string;
}

/**
 * Ghi issue Crashlytics thành incidents/crashlytics_{issueId}. Id cố định + create() nên giao lại alert
 * không tạo bản trùng. Trả false nếu đã có.
 */
export async function recordCrashlyticsIssue(issue: CrashlyticsIssueLike, appId: string): Promise<boolean> {
  const issueId = String(issue.id ?? "").replace(/[^A-Za-z0-9_-]/g, "_") || `unknown_${Date.now()}`;
  try {
    await db.doc(`incidents/crashlytics_${issueId}`).create({
      uid: null,
      email: null,
      kind: "crashlytics_issue",
      source: "crashlytics_alert",
      errorType: String(issue.title ?? "").slice(0, 120),
      message: String(issue.subtitle || issue.title || "Crashlytics fatal issue").slice(0, 500),
      stackTop: null,
      screen: null,
      appVersion: String(issue.appVersion ?? "").slice(0, 40),
      buildNumber: null,
      deviceModel: null,
      osVersion: null,
      occurredAt: FieldValue.serverTimestamp(),
      reportedAt: FieldValue.serverTimestamp(),
      status: "open",
      crashlyticsIssueId: String(issue.id ?? ""),
      appId,
    });
    return true;
  } catch (e) {
    if ((e as { code?: number }).code === 6) return false; // ALREADY_EXISTS
    throw e;
  }
}

/**
 * Crashlytics gom các crash giống nhau thành một "issue". Alert này chỉ bắn khi có issue MỚI,
 * nên là kênh bổ trợ: app vẫn tự ghi incidents/ cho từng lần crash.
 */
export const onCrashlyticsNewFatal = onNewFatalIssuePublished({ region: REGION }, async (event) => {
  await recordCrashlyticsIssue(event.data.payload.issue, event.appId);
});
