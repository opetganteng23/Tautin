import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { settleOrder } from "@/lib/orders";
import { bad, unauthorized } from "@/lib/api";
import type { Order } from "@/lib/types";

/** Cek status order langsung ke Midtrans (berguna bila webhook terlambat). */
export async function POST(req: Request) {
  const u = await getCurrentUser();
  if (!u) return unauthorized();
  const body = await req.json().catch(() => null);
  const db = await getDb();
  const order = await db.collection<Order>("orders").findOne({ midtransOrderId: String(body?.orderId ?? ""), userId: u._id });
  if (!order) return bad("Order tidak ditemukan", 404);
  const r = await settleOrder(order.midtransOrderId);
  return NextResponse.json({ status: r?.status ?? order.status });
}
