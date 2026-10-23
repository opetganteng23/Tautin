import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { effectivePlan } from "@/lib/plans";
import { checkUrl } from "@/lib/urlcheck";
import { bad, oid, unauthorized } from "@/lib/api";
import type { LinkDoc } from "@/lib/types";

const schema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  url: z.string().optional(),
  isActive: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const u = await getCurrentUser();
  if (!u) return unauthorized();
  const id = oid((await params).id);
  if (!id) return bad("ID tidak valid");
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0].message);

  const db = await getDb();
  const col = db.collection<LinkDoc>("links");
  const link = await col.findOne({ _id: id, userId: u._id });
  if (!link) return bad("Link tidak ditemukan", 404);

  const set: Partial<LinkDoc> = {};
  if (parsed.data.title !== undefined) set.title = parsed.data.title;
  if (parsed.data.url !== undefined && link.type !== "header") {
    const c = await checkUrl(parsed.data.url);
    if (!c.ok) return bad(c.error);
    set.url = c.url;
  }
  const unset: Record<string, ""> = {};
  if (parsed.data.isActive !== undefined) {
    if (parsed.data.isActive && !link.isActive) {
      const { plan } = await effectivePlan(u);
      const active = await col.countDocuments({ userId: u._id, isActive: true, disabledByPlan: { $ne: true } });
      if (active >= plan.maxLinks) return bad(`Batas ${plan.maxLinks} link pada paket ${plan.name} tercapai`, 403);
    }
    set.isActive = parsed.data.isActive;
    unset.disabledByPlan = "";
  }
  await col.updateOne({ _id: id }, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) });
  revalidatePath(`/${u.username}`);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const u = await getCurrentUser();
  if (!u) return unauthorized();
  const id = oid((await params).id);
  if (!id) return bad("ID tidak valid");
  const db = await getDb();
  await db.collection("links").deleteOne({ _id: id, userId: u._id });
  revalidatePath(`/${u.username}`);
  return NextResponse.json({ ok: true });
}
