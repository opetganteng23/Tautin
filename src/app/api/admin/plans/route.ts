import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { bad, forbidden, oid } from "@/lib/api";
import type { Plan } from "@/lib/types";

const schema = z.object({
  name: z.string().trim().min(1).max(40),
  priceMonthly: z.number().int().min(0),
  priceYearly: z.number().int().min(0),
  maxLinks: z.number().int().min(1).max(10000),
  analyticsLevel: z.enum(["none", "basic", "full"]),
  allowedThemes: z.array(z.string()),
  removeBranding: z.boolean(),
  trialDays: z.number().int().min(0).max(365),
  isActive: z.boolean(),
});

const out = (p: Plan) => ({ ...p, _id: undefined, id: p._id.toString() });

export async function GET() {
  if (!(await requireAdmin())) return forbidden();
  const db = await getDb();
  return NextResponse.json((await db.collection<Plan>("plans").find().sort({ priceMonthly: 1 }).toArray()).map(out));
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return forbidden();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0].message);
  const db = await getDb();
  await db.collection("plans").insertOne({ ...parsed.data, isFree: false });
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  if (!(await requireAdmin())) return forbidden();
  const body = await req.json().catch(() => null);
  const id = oid(body?.id);
  const parsed = schema.safeParse(body);
  if (!id || !parsed.success) return bad(parsed.success ? "ID tidak valid" : parsed.error.issues[0].message);
  const db = await getDb();
  const cur = await db.collection<Plan>("plans").findOne({ _id: id });
  if (!cur) return bad("Paket tidak ditemukan", 404);
  // Paket Free: harga tetap 0 dan tidak boleh dinonaktifkan (jadi tujuan penurunan akun).
  const data = cur.isFree ? { ...parsed.data, priceMonthly: 0, priceYearly: 0, isActive: true, trialDays: 0 } : parsed.data;
  await db.collection("plans").updateOne({ _id: id }, { $set: data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return forbidden();
  const id = oid(new URL(req.url).searchParams.get("id"));
  if (!id) return bad("ID tidak valid");
  const db = await getDb();
  const cur = await db.collection<Plan>("plans").findOne({ _id: id });
  if (!cur) return bad("Paket tidak ditemukan", 404);
  if (cur.isFree) return bad("Paket Free tidak bisa dihapus");
  if ((await db.collection("users").countDocuments({ planId: id })) > 0 || (await db.collection("orders").countDocuments({ planId: id })) > 0) {
    return bad("Paket sudah dipakai user/order. Nonaktifkan saja.");
  }
  await db.collection("plans").deleteOne({ _id: id });
  return NextResponse.json({ ok: true });
}
