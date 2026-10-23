import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { applyPlanLimits } from "@/lib/plans";
import { bad, forbidden, oid } from "@/lib/api";
import type { Plan, User } from "@/lib/types";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(req: Request) {
  if (!(await requireAdmin())) return forbidden();
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  const db = await getDb();
  const filter = q ? { $or: [{ email: new RegExp(escape(q), "i") }, { username: new RegExp(escape(q), "i") }] } : {};
  const users = await db.collection<User>("users").find(filter, { projection: { passwordHash: 0, verifyTokenHash: 0, resetTokenHash: 0 } }).sort({ createdAt: -1 }).limit(50).toArray();
  const plans = await db.collection<Plan>("plans").find().toArray();
  const names = new Map(plans.map((p) => [p._id.toString(), p.name]));
  return NextResponse.json(users.map((u) => ({
    id: u._id.toString(), email: u.email, username: u.username, role: u.role, status: u.status, emailVerified: u.emailVerified,
    plan: u.planId ? names.get(u.planId.toString()) ?? "?" : "Free", planExpiresAt: u.planExpiresAt, trialUsed: u.trialUsed, createdAt: u.createdAt,
  })));
}

const schema = z.object({
  id: z.string(),
  action: z.enum(["suspend", "activate", "setPlan", "grantTrial", "resetTrial"]),
  planId: z.string().nullable().optional(),
  days: z.number().int().min(1).max(3650).optional(),
});

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return forbidden();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("Data tidak valid");
  const { action, days } = parsed.data;
  const id = oid(parsed.data.id);
  if (!id) return bad("ID tidak valid");
  const db = await getDb();
  const users = db.collection<User>("users");
  const target = await users.findOne({ _id: id });
  if (!target) return bad("User tidak ditemukan", 404);

  if (action === "suspend" || action === "activate") {
    if (target._id.equals(admin._id)) return bad("Tidak bisa mengubah status akun sendiri");
    await users.updateOne({ _id: id }, { $set: { status: action === "suspend" ? "suspended" : "active" } });
  } else if (action === "resetTrial") {
    await users.updateOne({ _id: id }, { $set: { trialUsed: false } });
  } else {
    // setPlan: planId null = turunkan ke Free. grantTrial: beri paket sementara tanpa menghabiskan jatah trial user.
    const planId = parsed.data.planId ? oid(parsed.data.planId) : null;
    if (planId && !(await db.collection("plans").findOne({ _id: planId }))) return bad("Paket tidak ditemukan", 404);
    if (planId && !days) return bad("Isi jumlah hari");
    await users.updateOne({ _id: id }, { $set: { planId, planExpiresAt: planId ? new Date(Date.now() + days! * 86400000) : null } });
    await applyPlanLimits(id);
  }
  revalidatePath(`/${target.username}`);
  return NextResponse.json({ ok: true });
}
