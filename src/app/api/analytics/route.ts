import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { effectivePlan } from "@/lib/plans";
import { ensureProfile } from "@/lib/profile";
import { dayKey } from "@/lib/analytics";
import { unauthorized } from "@/lib/api";
import type { LinkDoc } from "@/lib/types";

/** Kedalaman data mengikuti plan.analyticsLevel: none (total klik) < basic (7/30 hari) < full (sumber, perangkat, negara). */
export async function GET() {
  const u = await getCurrentUser();
  if (!u) return unauthorized();
  const db = await getDb();
  const { plan } = await effectivePlan(u);
  const level = plan.analyticsLevel;
  const profile = await ensureProfile(u);
  const links = await db.collection<LinkDoc>("links").find({ userId: u._id }).sort({ clickCount: -1 }).toArray();
  const perLink = links.filter((l) => l.type !== "header").map((l) => ({ id: l._id.toString(), title: l.title, clicks: l.clickCount }));
  const totalClicks = links.reduce((n, l) => n + l.clickCount, 0);
  if (level === "none") return NextResponse.json({ level, totalClicks, perLink });

  const since = new Date(Date.now() - 29 * 86400000);
  const daily = await db.collection("analyticsDaily").find({ profileId: profile._id, date: { $gte: dayKey(since) } }).sort({ date: 1 }).toArray();
  const days = Array.from({ length: 30 }, (_, i) => dayKey(new Date(since.getTime() + i * 86400000)));
  const byDate = new Map(daily.map((d) => [d.date as string, d]));
  const series = days.map((date) => ({ date, views: byDate.get(date)?.views ?? 0, clicks: byDate.get(date)?.clicks ?? 0 }));
  const sum = (n: number, k: "views" | "clicks") => series.slice(-n).reduce((a, d) => a + d[k], 0);
  const out: Record<string, unknown> = {
    level, totalClicks, perLink, series,
    views7: sum(7, "views"), views30: sum(30, "views"), clicks7: sum(7, "clicks"), clicks30: sum(30, "clicks"),
  };
  if (level === "full") {
    const top = (col: string, field: string) =>
      db.collection(col).aggregate([
        { $match: { profileId: profile._id, timestamp: { $gte: since } } },
        { $group: { _id: `$${field}`, n: { $sum: 1 } } },
        { $sort: { n: -1 } }, { $limit: 8 },
      ]).toArray().then((r) => r.map((x) => ({ name: String(x._id), n: x.n as number })));
    const [referrers, devices, countries] = await Promise.all([top("pageViews", "referrer"), top("pageViews", "device"), top("pageViews", "country")]);
    Object.assign(out, { referrers, devices, countries });
  }
  return NextResponse.json(out);
}
