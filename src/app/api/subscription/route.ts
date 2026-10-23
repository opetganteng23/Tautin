import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { effectivePlan, getSettings } from "@/lib/plans";
import { publicPlan } from "@/lib/publicplan";
import { unauthorized } from "@/lib/api";
import type { Order, Plan } from "@/lib/types";

export async function GET() {
  const u = await getCurrentUser();
  if (!u) return unauthorized();
  const db = await getDb();
  const [{ plan, state }, settings, plans, orders] = await Promise.all([
    effectivePlan(u),
    getSettings(),
    db.collection<Plan>("plans").find({ isActive: true }).sort({ priceMonthly: 1 }).toArray(),
    db.collection<Order>("orders").find({ userId: u._id }).sort({ createdAt: -1 }).limit(20).toArray(),
  ]);
  return NextResponse.json({
    user: { username: u.username, email: u.email, emailVerified: u.emailVerified, trialUsed: u.trialUsed },
    plan: publicPlan(plan),
    state,
    expiresAt: u.planExpiresAt,
    graceDays: settings.gracePeriodDays,
    freeMode: settings.freeModeGlobal,
    paymentsEnabled: settings.paymentsEnabled,
    plans: plans.map(publicPlan),
    orders: orders.map((o) => ({ id: o._id.toString(), orderId: o.midtransOrderId, planName: o.planName, period: o.period, amount: o.amount, status: o.status, paymentType: o.paymentType, createdAt: o.createdAt, paidAt: o.paidAt })),
  });
}
