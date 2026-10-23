import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getSettings } from "@/lib/plans";
import { bad, forbidden } from "@/lib/api";

export async function GET() {
  if (!(await requireAdmin())) return forbidden();
  return NextResponse.json(await getSettings());
}

const schema = z.object({
  freeModeGlobal: z.boolean(),
  paymentsEnabled: z.boolean(),
  gracePeriodDays: z.number().int().min(0).max(90),
  reservedUsernames: z.array(z.string().trim().toLowerCase().min(1).max(40)).max(1000),
});

export async function PUT(req: Request) {
  if (!(await requireAdmin())) return forbidden();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("Data tidak valid");
  const db = await getDb();
  await db.collection("settings").updateOne({}, { $set: parsed.data }, { upsert: true });
  return NextResponse.json({ ok: true });
}
