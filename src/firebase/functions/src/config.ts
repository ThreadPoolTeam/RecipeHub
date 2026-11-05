import { defineString } from "firebase-functions/params";

/** Region cho mọi function (gần Firestore asia-southeast1). */
export const REGION = "asia-southeast1";
/** Topic FCM mọi thiết bị đăng nhập đều subscribe. */
export const TOPIC_ALL = "all_staff";
/** Múi giờ tính "ngày" cho thống kê. */
export const TIME_ZONE = "Asia/Ho_Chi_Minh";
/** Email được cấp quyền admin khi đăng nhập lần đầu (cách nhau bằng dấu phẩy). */
export const ADMIN_EMAILS = defineString("ADMIN_EMAILS", { default: "" });

export type Role = "viewer" | "admin";

export function parseAdminEmails(raw: string): string[] {
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

export function roleForEmail(email: string | undefined | null, raw: string): Role {
  if (!email) return "viewer";
  return parseAdminEmails(raw).includes(email.toLowerCase()) ? "admin" : "viewer";
}
