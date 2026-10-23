import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { DEFAULT_RESERVED } from "./seed-constants";
import type { LinkDoc, Plan, Settings, Theme, User } from "./types";

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const s = await db.collection("settings").findOne({});
  return {
    freeModeGlobal: s?.freeModeGlobal ?? false,
    reservedUsernames: s?.reservedUsernames ?? DEFAULT_RESERVED,
    gracePeriodDays: s?.gracePeriodDays ?? 7,
  };
}

export const FALLBACK_FREE: Plan = {
  _id: new ObjectId("000000000000000000000000"), name: "Free", priceMonthly: 0, priceYearly: 0, maxLinks: 5,
  analyticsLevel: "none", allowedThemes: [], removeBranding: false, trialDays: 0, isActive: true, isFree: true,
};

export type PlanState = "free" | "active" | "grace" | "freemode";

/** Paket yang berlaku saat ini. Semua batas dibaca dari koleksi `plans`. */
export async function effectivePlan(user: Pick<User, "planId" | "planExpiresAt">): Promise<{ plan: Plan; state: PlanState }> {
  const db = await getDb();
  const plans = db.collection<Plan>("plans");
  const s = await getSettings();
  if (s.freeModeGlobal) {
    const best = await plans.find({ isActive: true, isFree: false }).sort({ priceMonthly: -1 }).limit(1).next();
    if (best) return { plan: best, state: "freemode" };
  }
  if (user.planId && user.planExpiresAt) {
    const p = await plans.findOne({ _id: user.planId });
    if (p) {
      const exp = user.planExpiresAt.getTime();
      if (exp > Date.now()) return { plan: p, state: "active" };
      if (Date.now() < exp + s.gracePeriodDays * 86400000) return { plan: p, state: "grace" };
    }
  }
  return { plan: (await plans.findOne({ isFree: true })) ?? FALLBACK_FREE, state: "free" };
}

export function themeAllowed(plan: Plan, theme: Pick<Theme, "_id" | "isPremium">) {
  return !theme.isPremium || plan.allowedThemes.includes("*") || plan.allowedThemes.includes(theme._id.toString());
}

/**
 * Sesuaikan link dengan batas paket. Link berlebih DINONAKTIFKAN (bukan dihapus)
 * dan diaktifkan lagi otomatis bila batas naik.
 */
export async function applyPlanLimits(userId: ObjectId) {
  const db = await getDb();
  const user = await db.collection<User>("users").findOne({ _id: userId });
  if (!user) return;
  const { plan } = await effectivePlan(user);
  const col = db.collection<LinkDoc>("links");
  const links = await col.find({ userId }).sort({ order: 1 }).toArray();
  let used = 0;
  const off: ObjectId[] = [];
  const on: ObjectId[] = [];
  for (const l of links) {
    if (l.isActive && !l.disabledByPlan) {
      if (used < plan.maxLinks) used++;
      else off.push(l._id);
    }
  }
  for (const l of links) {
    if (l.disabledByPlan && used < plan.maxLinks) { on.push(l._id); used++; }
  }
  if (off.length) await col.updateMany({ _id: { $in: off } }, { $set: { isActive: false, disabledByPlan: true } });
  if (on.length) await col.updateMany({ _id: { $in: on } }, { $set: { isActive: true }, $unset: { disabledByPlan: "" } });
}

/** Perpanjang paket: mulai dari kedaluwarsa saat ini bila masih berlaku, kalau tidak dari sekarang. */
export function extendFrom(current: Date | null, period: "monthly" | "yearly") {
  const start = current && current.getTime() > Date.now() ? new Date(current) : new Date();
  if (period === "yearly") start.setFullYear(start.getFullYear() + 1);
  else start.setMonth(start.getMonth() + 1);
  return start;
}
