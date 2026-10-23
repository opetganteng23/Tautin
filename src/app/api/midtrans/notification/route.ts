import { NextResponse } from "next/server";
import { validSignature } from "@/lib/midtrans";
import { settleOrder } from "@/lib/orders";

/**
 * Webhook Midtrans. Signature diverifikasi, lalu status dicek ulang ke API Midtrans
 * (payload tidak dipercaya) dan diproses idempoten di settleOrder.
 */
export async function POST(req: Request) {
  const n = await req.json().catch(() => null);
  if (!n || !validSignature(n)) return NextResponse.json({ error: "Signature tidak valid" }, { status: 403 });
  try {
    await settleOrder(String(n.order_id));
  } catch (e) {
    console.error("midtrans notification", e);
    return NextResponse.json({ error: "gagal" }, { status: 500 }); // Midtrans akan mengirim ulang
  }
  return NextResponse.json({ ok: true });
}
