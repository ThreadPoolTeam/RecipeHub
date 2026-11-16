import { FieldValue } from "firebase-admin/firestore";
import { auth, db } from "../lib/admin";
import { bumpSummary } from "../lib/stats";
import { Role, roleForEmail } from "../config";

export interface NewUserInfo {
  uid: string;
  email?: string | null;
  emailVerified?: boolean;
  displayName?: string | null;
  photoURL?: string | null;
  isAnonymous: boolean;
  disabled?: boolean;
}

/** Chỉ cấp admin theo ADMIN_EMAILS khi email đã được xác minh (Google luôn xác minh). */
export function initialRole(user: NewUserInfo, adminEmailsRaw: string): Role {
  return user.emailVerified === true ? roleForEmail(user.email, adminEmailsRaw) : "viewer";
}

/**
 * Tạo hồ sơ users/{uid} + bộ đếm trong CÙNG transaction (không trôi số khi lỗi giữa chừng), rồi đặt claim.
 * Gọi lại nhiều lần an toàn; claim luôn được đặt lại theo Firestore nếu lệch. Trả về role hiện tại.
 */
export async function provisionUser(user: NewUserInfo, adminEmailsRaw: string): Promise<Role> {
  const ref = db.doc(`users/${user.uid}`);
  const wanted = initialRole(user, adminEmailsRaw);
  const disabled = user.disabled === true;
  const role = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      // Hồ sơ cũ: cập nhật thông tin có thể đổi (liên kết khách → Google), giữ role/disabled do Admin quản lý.
      const patch: Record<string, unknown> = {};
      if (user.email && snap.get("email") !== user.email) patch.email = user.email;
      if (user.displayName && snap.get("displayName") !== user.displayName) patch.displayName = user.displayName;
      if (snap.get("isAnonymous") === true && !user.isAnonymous) patch.isAnonymous = false;
      if (Object.keys(patch).length > 0) tx.update(ref, patch);
      return (snap.get("role") as Role) ?? "viewer";
    }
    tx.set(ref, {
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      photoUrl: user.photoURL ?? null,
      role: wanted,
      disabled,
      isAnonymous: user.isAnonymous,
      deviceCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      claimsUpdatedAt: FieldValue.serverTimestamp(),
    });
    await bumpSummary(
      { totalUsers: 1, adminUsers: wanted === "admin" ? 1 : 0, disabledUsers: disabled ? 1 : 0 },
      tx,
    );
    return wanted;
  });
  const current = (await auth.getUser(user.uid)).customClaims ?? {};
  if (current.role !== role) await auth.setCustomUserClaims(user.uid, { ...current, role });
  return role;
}
