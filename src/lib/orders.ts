import { revalidatePath } from "next/cache";
import { getDb } from "./db";
import { applyPlanLimits, extendFrom } from "./plans";
import { fetchStatus } from "./midtrans";
import type { Order, User } from "./types";

/**
 * Sinkronkan satu order dengan status Midtrans. IDEMPOTEN: aktivasi paket hanya
 * berjalan sekali lewat flag atomik `processed`, berapa pun webhook/sync datang.
 */
export async function settleOrder(midtransOrderId: string) {
  const db = await getDb();
  const orders = db.collection<Order>("orders");
  const order = await orders.findOne({ midtransOrderId });
  if (!order) return null;
  const st = await fetchStatus(midtransOrderId);
  const ts = st.transaction_status;
  const paid = ts === "settlement" || (ts === "capture" && st.fraud_status !== "deny");
  if (paid) {
    if (Number(st.gross_amount) !== order.amount) return order; // jumlah tidak cocok: abaikan
    const claimed = await orders.findOneAndUpdate(
      { midtransOrderId, processed: false },
      { $set: { processed: true, status: "settlement", paymentType: st.payment_type, paidAt: new Date() } },
      { returnDocument: "after" }
    );
    if (claimed) {
      const users = db.collection<User>("users");
      const u = await users.findOne({ _id: order.userId });
      if (u) {
        const sameActive = u.planId?.equals(order.planId) ? u.planExpiresAt : null;
        await users.updateOne({ _id: u._id }, { $set: { planId: order.planId, planExpiresAt: extendFrom(sameActive, order.period) } });
        await applyPlanLimits(u._id);
        revalidatePath(`/${u.username}`);
      }
    }
  } else if (ts === "expire" || ts === "cancel" || ts === "deny") {
    await orders.updateOne({ midtransOrderId, processed: false }, { $set: { status: ts === "expire" ? "expire" : "cancel" } });
  }
  return orders.findOne({ midtransOrderId });
}
