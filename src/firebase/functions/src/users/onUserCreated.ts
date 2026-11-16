import * as functionsV1 from "firebase-functions/v1";
import { ADMIN_EMAILS, REGION } from "../config";
import { provisionUser } from "./provision";
import { db } from "../lib/admin";
import { bumpSummary } from "../lib/stats";

/** Auth trigger: user mới → hồ sơ Firestore + claim role (admin nếu email đã xác minh thuộc ADMIN_EMAILS). */
export const onUserCreated = functionsV1
  .region(REGION)
  .auth.user()
  .onCreate(async (user) => {
    const role = await provisionUser(
      {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isAnonymous: user.providerData.length === 0,
        disabled: user.disabled,
      },
      ADMIN_EMAILS.value(),
    );
    console.log(`provisioned uid=${user.uid} role=${role}`);
  });

/** Xóa hồ sơ + giảm bộ đếm trong một transaction (giao lại lần 2 thấy doc đã mất → không trừ trùng). */
export async function deprovisionUser(uid: string): Promise<boolean> {
  const ref = db.doc(`users/${uid}`);
  const removed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return false;
    tx.delete(ref);
    await bumpSummary(
      {
        totalUsers: -1,
        adminUsers: snap.get("role") === "admin" ? -1 : 0,
        disabledUsers: snap.get("disabled") === true ? -1 : 0,
      },
      tx,
    );
    return true;
  });
  await db.recursiveDelete(ref.collection("devices"));
  return removed;
}

export const onUserDeleted = functionsV1
  .region(REGION)
  .auth.user()
  .onDelete(async (user) => {
    await deprovisionUser(user.uid);
  });
