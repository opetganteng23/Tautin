import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { forbidden } from "@/lib/api";
import type { Order, User } from "@/lib/types";

export async function GET() {
  if (!(await requireAdmin())) return forbidden();
  const db = await getDb();
  const orders = await db.collection<Order>("orders").find().sort({ createdAt: -1 }).limit(100).toArray();
  const users = await db.collection<User>("users").find({ _id: { $in: orders.map((o) => o.userId) } }, { projection: { username: 1, email: 1 } }).toArray();
  const byId = new Map(users.map((u) => [u._id.toString(), u]));
  return NextResponse.json(orders.map((o) => ({
    id: o._id.toString(), orderId: o.midtransOrderId, username: byId.get(o.userId.toString())?.username ?? "?", email: byId.get(o.userId.toString())?.email ?? "",
    planName: o.planName, period: o.period, amount: o.amount, status: o.status, paymentType: o.paymentType, createdAt: o.createdAt, paidAt: o.paidAt,
  })));
}
