import { HttpsError } from "firebase-functions/v2/https";

/** uid Firebase: không chứa "/" để không trỏ được sang document khác. */
const UID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export function asObject(data: unknown): Record<string, unknown> {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new HttpsError("invalid-argument", "Dữ liệu gửi lên không hợp lệ.");
  }
  return data as Record<string, unknown>;
}

export function requireString(o: Record<string, unknown>, key: string, min: number, max: number, label: string): string {
  const v = o[key];
  if (typeof v !== "string") throw new HttpsError("invalid-argument", `${label} là bắt buộc.`);
  const s = v.trim();
  if (s.length < min || s.length > max) {
    throw new HttpsError("invalid-argument", `${label} phải dài ${min}–${max} ký tự.`);
  }
  return s;
}

export function requireUid(o: Record<string, unknown>, key: string, label: string): string {
  const v = requireString(o, key, 1, 128, label);
  if (!UID_PATTERN.test(v)) throw new HttpsError("invalid-argument", `${label} không hợp lệ.`);
  return v;
}

export function optionalString(o: Record<string, unknown>, key: string, max: number, label: string): string | null {
  const v = o[key];
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string" || v.trim().length > max) {
    throw new HttpsError("invalid-argument", `${label} tối đa ${max} ký tự.`);
  }
  return v.trim();
}

export function requireEnum<T extends string>(o: Record<string, unknown>, key: string, values: readonly T[], label: string): T {
  const v = o[key];
  if (typeof v !== "string" || !values.includes(v as T)) {
    throw new HttpsError("invalid-argument", `${label} không hợp lệ.`);
  }
  return v as T;
}

export function requireBoolean(o: Record<string, unknown>, key: string, label: string): boolean {
  const v = o[key];
  if (typeof v !== "boolean") throw new HttpsError("invalid-argument", `${label} không hợp lệ.`);
  return v;
}
