import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { effectivePlan } from "@/lib/plans";
import { checkUrl } from "@/lib/urlcheck";
import { bad, unauthorized } from "@/lib/api";
import type { LinkDoc } from "@/lib/types";

const MAX_TOTAL = 200;
const schema = z.object({
  type: z.enum(["link", "header", "social"]).default("link"),
  title: z.string().trim().min(1, "Judul wajib diisi").max(100),
  url: z.string().optional(),
});

export async function GET() {
  const u = await getCurrentUser();
  if (!u) return unauthorized();
  const db = await getDb();
  const { plan } = await effectivePlan(u);
  const links = await db.collection<LinkDoc>("links").find({ userId: u._id }).sort({ order: 1 }).toArray();
  const used = links.filter((l) => l.isActive && !l.disabledByPlan).length;
  return NextResponse.json({
    maxLinks: plan.maxLinks,
    used,
    links: links.map((l) => ({ id: l._id.toString(), type: l.type, title: l.title, url: l.url, isActive: l.isActive, clickCount: l.clickCount, disabledByPlan: !!l.disabledByPlan })),
  });
}

export async function POST(req: Request) {
  const u = await getCurrentUser();
  if (!u) return unauthorized();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0].message);
  const { type, title } = parsed.data;

  let url = "";
  if (type !== "header") {
    const c = await checkUrl(parsed.data.url ?? "");
    if (!c.ok) return bad(c.error);
    url = c.url;
  }

  const db = await getDb();
  const col = db.collection<Omit<LinkDoc, "_id">>("links");
  const { plan } = await effectivePlan(u);
  const [active, total, last] = await Promise.all([
    col.countDocuments({ userId: u._id, isActive: true, disabledByPlan: { $ne: true } }),
    col.countDocuments({ userId: u._id }),
    col.find({ userId: u._id }).sort({ order: -1 }).limit(1).next(),
  ]);
  if (active >= plan.maxLinks) return bad(`Batas ${plan.maxLinks} link pada paket ${plan.name} tercapai. Upgrade paket untuk menambah.`, 403);
  if (total >= MAX_TOTAL) return bad("Jumlah item maksimum tercapai", 403);

  const doc = { userId: u._id, type, title, url, order: (last?.order ?? -1) + 1, isActive: true, clickCount: 0 };
  const r = await col.insertOne(doc);
  revalidatePath(`/${u.username}`);
  return NextResponse.json({ ok: true, id: r.insertedId.toString() });
}
