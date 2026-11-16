import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";
import { REGION } from "../config";
import { db } from "../lib/admin";
import { assertAdmin, Caller } from "../lib/guards";
import seed from "../data/recipes.seed.json";

/**
 * Nạp 6 món mẫu (xuất từ Recipe service qua Gateway) vào recipes/{code}.
 * Không ghi đè món đã có, nên gọi lại nhiều lần vẫn an toàn.
 */
export async function seedRecipesHandler(caller: Caller): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;
  for (const r of seed) {
    const ref = db.doc(`recipes/${r.code}`);
    const ok = await db.runTransaction(async (tx) => {
      if ((await tx.get(ref)).exists) return false;
      tx.set(ref, { ...r, updatedAt: FieldValue.serverTimestamp(), updatedBy: caller.email });
      return true;
    });
    if (ok) created++;
    else skipped++;
  }
  return { created, skipped };
}

export const seedRecipes = onCall({ region: REGION }, async (req) => {
  const caller = await assertAdmin(req);
  return seedRecipesHandler(caller);
});
