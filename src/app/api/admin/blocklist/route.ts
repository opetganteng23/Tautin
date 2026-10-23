import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { bad, forbidden, oid } from "@/lib/api";

export async function GET() {
  if (!(await requireAdmin())) return forbidden();
  const db = await getDb();
  const list = await db.collection("blocklist").find().sort({ createdAt: -1 }).limit(500).toArray();
  return NextResponse.json(list.map((b) => ({ id: b._id.toString(), domain: b.domain, reason: b.reason, createdAt: b.createdAt })));
}

function normalizeDomain(raw: string) {
  const s = raw.trim().toLowerCase();
  try { return new URL(s.includes("://") ? s : `http://${s}`).hostname.replace(/^www\./, ""); } catch { return ""; }
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return forbidden();
  const parsed = z.object({ domain: z.string().min(3).max(253), reason: z.string().trim().max(200).default("") }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("Data tidak valid");
  const domain = normalizeDomain(parsed.data.domain);
  if (!domain.includes(".")) return bad("Domain tidak valid");
  try {
    await (await getDb()).collection("blocklist").insertOne({ domain, reason: parsed.data.reason, createdAt: new Date() });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return bad("Domain sudah ada di blocklist", 409);
    throw e;
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return forbidden();
  const id = oid(new URL(req.url).searchParams.get("id"));
  if (!id) return bad("ID tidak valid");
  await (await getDb()).collection("blocklist").deleteOne({ _id: id });
  return NextResponse.json({ ok: true });
}
