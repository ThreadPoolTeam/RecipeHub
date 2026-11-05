import { onCall } from "firebase-functions/v2/https";
import { ADMIN_EMAILS, REGION } from "../config";
import { auth } from "../lib/admin";
import { assertAdmin } from "../lib/guards";
import { provisionUser } from "./provision";

/** Tạo hồ sơ cho user có từ trước khi deploy trigger. Chạy được nhiều lần. */
export async function backfillAll(adminEmailsRaw: string): Promise<{ scanned: number }> {
  let scanned = 0;
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const u of page.users) {
      scanned++;
      await provisionUser(
        {
          uid: u.uid,
          email: u.email,
          emailVerified: u.emailVerified,
          displayName: u.displayName,
          photoURL: u.photoURL,
          isAnonymous: u.providerData.length === 0,
          disabled: u.disabled,
        },
        adminEmailsRaw,
      );
    }
    pageToken = page.pageToken;
  } while (pageToken);
  return { scanned };
}

export const backfillUsers = onCall({ region: REGION, timeoutSeconds: 300 }, async (req) => {
  await assertAdmin(req);
  return backfillAll(ADMIN_EMAILS.value());
});
