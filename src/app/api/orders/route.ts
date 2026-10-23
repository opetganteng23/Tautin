import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { rateLimit } from "@/lib/ratelimit";
import { createSnapTransaction, snapScriptUrl } from "@/lib/midtrans";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/plans";
import { bad, oid, unauthorized } from "@/lib/api";
import type { Order, Plan } from "@/lib/types";

const schema = z.object({ planId: z.string(), period: z.enum(["monthly", "yearly"]) });

/** Buat order + transaksi Snap. Prabayar: bayar 1 bulan / 1 tahun, tanpa langganan berulang. */
export async function POST(req: Request) {
  const u = await getCurrentUser();
  if (!u) return unauthorized();
  if (!(await getSettings()).paymentsEnabled) return bad("Pembayaran belum dibuka. Silakan coba lagi nanti.", 403);
  if (!(await rateLimit(`order:${u._id}`, 10, 3600))) return bad("Terlalu banyak percobaan, coba lagi nanti", 429);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  const planId = parsed.success ? oid(parsed.data.planId) : null;
  if (!parsed.success || !planId) return bad("Data tidak valid");

  const db = await getDb();
  const plan = await db.collection<Plan>("plans").findOne({ _id: planId, isActive: true, isFree: false });
  if (!plan) return bad("Paket tidak ditemukan", 404);
  const { period } = parsed.data;
  const amount = period === "yearly" ? plan.priceYearly : plan.priceMonthly;
  if (!Number.isInteger(amount) || amount <= 0) return bad("Harga paket belum diatur");

  const midtransOrderId = `TAU-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`.toUpperCase();
  let token: string;
  try {
    ({ token } = await createSnapTransaction({
      orderId: midtransOrderId, amount, email: u.email,
      itemName: `Tautin ${plan.name} ${period === "yearly" ? "1 tahun" : "1 bulan"}`,
    }));
  } catch (e) {
    console.error(e);
    return bad("Gagal membuat transaksi pembayaran", 502);
  }
  await db.collection<Omit<Order, "_id">>("orders").insertOne({
    userId: u._id, planId, planName: plan.name, period, amount, midtransOrderId, snapToken: token,
    status: "pending", processed: false, createdAt: new Date(),
  });
  return NextResponse.json({ token, orderId: midtransOrderId, clientKey: env("MIDTRANS_CLIENT_KEY"), snapUrl: snapScriptUrl() });
}
