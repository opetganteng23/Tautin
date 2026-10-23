import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { bad } from "@/lib/api";
import type { User } from "@/lib/types";

const schema = z.object({
  username: z.string().trim().toLowerCase().min(1).max(40),
  reason: z.string().trim().min(5, "Jelaskan alasan laporan (min. 5 karakter)").max(500),
  reporterEmail: z.string().trim().email().max(254).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  if (!(await rateLimit(`report:${clientIp(req)}`, 5, 3600))) return bad("Terlalu banyak laporan, coba lagi nanti", 429);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0].message);
  const db = await getDb();
  const user = await db.collection<User>("users").findOne({ username: parsed.data.username });
  if (!user) return bad("Profil tidak ditemukan", 404);
  const profile = await db.collection("profiles").findOne({ userId: user._id });
  await db.collection("reports").insertOne({
    profileId: profile?._id ?? null, username: user.username, reason: parsed.data.reason,
    reporterEmail: parsed.data.reporterEmail || "", status: "open", createdAt: new Date(),
  });
  return NextResponse.json({ ok: true });
}
