import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { configSchema } from "@/lib/profile";
import { bad, forbidden, oid } from "@/lib/api";
import type { Theme } from "@/lib/types";

const schema = z.object({ name: z.string().trim().min(1).max(40), isPremium: z.boolean(), config: configSchema });

export async function GET() {
  if (!(await requireAdmin())) return forbidden();
  const db = await getDb();
  return NextResponse.json((await db.collection<Theme>("themes").find().sort({ isPremium: 1, _id: 1 }).toArray()).map((t) => ({ id: t._id.toString(), name: t.name, isPremium: t.isPremium, config: t.config })));
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return forbidden();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(`Konfigurasi tema tidak valid: ${parsed.error.issues[0].path.join(".")} ${parsed.error.issues[0].message}`);
  await (await getDb()).collection("themes").insertOne(parsed.data);
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  if (!(await requireAdmin())) return forbidden();
  const body = await req.json().catch(() => null);
  const id = oid(body?.id);
  const parsed = schema.safeParse(body);
  if (!id || !parsed.success) return bad(parsed.success ? "ID tidak valid" : `Konfigurasi tema tidak valid: ${parsed.error.issues[0].path.join(".")} ${parsed.error.issues[0].message}`);
  await (await getDb()).collection("themes").updateOne({ _id: id }, { $set: parsed.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return forbidden();
  const id = oid(new URL(req.url).searchParams.get("id"));
  if (!id) return bad("ID tidak valid");
  const db = await getDb();
  if ((await db.collection("themes").countDocuments({ isPremium: false, _id: { $ne: id } })) === 0) return bad("Harus ada minimal satu tema gratis");
  await db.collection("themes").deleteOne({ _id: id });
  await db.collection("profiles").updateMany({ themeId: id }, { $set: { themeId: null } });
  return NextResponse.json({ ok: true });
}
