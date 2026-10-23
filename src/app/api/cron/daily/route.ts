import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { applyPlanLimits, getSettings } from "@/lib/plans";
import { sendExpiryReminder } from "@/lib/emails";
import { dayKey } from "@/lib/analytics";
import { env } from "@/lib/env";
import type { Plan, User } from "@/lib/types";

const DAY = 86400000;

/**
 * Cron harian (dipanggil crontab server dengan header x-cron-secret):
 * 1) turunkan akun kedaluwarsa + masa tenggang ke Free, 2) email pengingat H-7/H-1, 3) rangkum analitik kemarin.
 */
export async function POST(req: Request) {
  if (req.headers.get("x-cron-secret") !== env("CRON_SECRET")) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  const db = await getDb();
  const users = db.collection<User>("users");
  const now = new Date();
  const { gracePeriodDays } = await getSettings();

  // 1) kedaluwarsa
  const expired = await users.find({ planId: { $ne: null }, planExpiresAt: { $lt: new Date(now.getTime() - gracePeriodDays * DAY) } }).toArray();
  for (const u of expired) {
    await users.updateOne({ _id: u._id }, { $set: { planId: null, planExpiresAt: null } });
    await applyPlanLimits(u._id);
    revalidatePath(`/${u.username}`);
  }

  // 2) pengingat
  let reminded = 0;
  const soon = await users.find({ planId: { $ne: null }, planExpiresAt: { $gt: now, $lte: new Date(now.getTime() + 7 * DAY) } }).toArray();
  for (const u of soon) {
    const exp = u.planExpiresAt!;
    const days = Math.ceil((exp.getTime() - now.getTime()) / DAY);
    const key = days <= 1 ? "reminded1For" : "reminded7For";
    if (u[key]?.getTime() === exp.getTime()) continue;
    const plan = await db.collection<Plan>("plans").findOne({ _id: u.planId! });
    try {
      await sendExpiryReminder(u.email, days, plan?.name ?? "berbayar");
      await users.updateOne({ _id: u._id }, { $set: { [key]: exp } });
      reminded++;
    } catch (e) {
      console.error("pengingat gagal", u.email, e);
    }
  }

  // 3) rangkum analitik kemarin dari data mentah (idempoten)
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const end = new Date(start.getTime() + DAY);
  const date = dayKey(start);
  const count = (col: string) =>
    db.collection(col).aggregate([{ $match: { timestamp: { $gte: start, $lt: end } } }, { $group: { _id: "$profileId", n: { $sum: 1 } } }]).toArray();
  const [views, clicks] = await Promise.all([count("pageViews"), count("clickEvents")]);
  const agg = new Map<string, { profileId: unknown; views: number; clicks: number }>();
  for (const v of views) agg.set(String(v._id), { profileId: v._id, views: v.n, clicks: 0 });
  for (const c of clicks) agg.set(String(c._id), { ...(agg.get(String(c._id)) ?? { profileId: c._id, views: 0 }), clicks: c.n });
  for (const r of agg.values()) {
    await db.collection("analyticsDaily").updateOne({ profileId: r.profileId as never, date }, { $set: { views: r.views, clicks: r.clicks } }, { upsert: true });
  }

  return NextResponse.json({ ok: true, expired: expired.length, reminded, summarized: agg.size, date });
}
