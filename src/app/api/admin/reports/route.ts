import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { bad, forbidden, oid } from "@/lib/api";

export async function GET() {
  if (!(await requireAdmin())) return forbidden();
  const db = await getDb();
  const reports = await db.collection("reports").find().sort({ status: 1, createdAt: -1 }).limit(100).toArray();
  return NextResponse.json(reports.map((r) => ({ id: r._id.toString(), username: r.username, reason: r.reason, reporterEmail: r.reporterEmail, status: r.status, createdAt: r.createdAt })));
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return forbidden();
  const parsed = z.object({ id: z.string(), status: z.enum(["open", "reviewed", "actioned", "dismissed"]) }).safeParse(await req.json().catch(() => null));
  const id = parsed.success ? oid(parsed.data.id) : null;
  if (!parsed.success || !id) return bad("Data tidak valid");
  await (await getDb()).collection("reports").updateOne({ _id: id }, { $set: { status: parsed.data.status } });
  return NextResponse.json({ ok: true });
}
