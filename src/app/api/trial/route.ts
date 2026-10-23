import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { applyPlanLimits, effectivePlan } from "@/lib/plans";
import { bad, oid, unauthorized } from "@/lib/api";
import type { Plan, User } from "@/lib/types";

/** Trial paket berbayar: sekali per akun, durasi dari plan.trialDays. */
export async function POST(req: Request) {
  const u = await getCurrentUser();
  if (!u) return unauthorized();
  const body = await req.json().catch(() => null);
  const planId = oid(body?.planId);
  if (!planId) return bad("Paket tidak valid");
  if (u.trialUsed) return bad("Trial sudah pernah dipakai", 403);

  const db = await getDb();
  const plan = await db.collection<Plan>("plans").findOne({ _id: planId, isActive: true, isFree: false });
  if (!plan || plan.trialDays <= 0) return bad("Paket ini tidak punya trial", 403);
  const { state } = await effectivePlan(u);
  if (state === "active") return bad("Anda masih memiliki paket aktif", 403);

  const claimed = await db.collection<User>("users").findOneAndUpdate(
    { _id: u._id, trialUsed: false },
    { $set: { planId, planExpiresAt: new Date(Date.now() + plan.trialDays * 86400000), trialUsed: true } }
  );
  if (!claimed) return bad("Trial sudah pernah dipakai", 403);
  await applyPlanLimits(u._id);
  revalidatePath(`/${u.username}`);
  return NextResponse.json({ ok: true });
}
