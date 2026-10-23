import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { newToken } from "@/lib/password";
import { rateLimit } from "@/lib/ratelimit";
import { sendVerifyEmail } from "@/lib/emails";
import { bad, unauthorized } from "@/lib/api";

export async function POST() {
  const u = await getCurrentUser();
  if (!u) return unauthorized();
  if (u.emailVerified) return bad("Email sudah terverifikasi");
  if (!(await rateLimit(`resend:${u._id}`, 3, 3600))) return bad("Terlalu banyak permintaan, coba lagi nanti", 429);
  const { token, hash } = newToken();
  const db = await getDb();
  await db.collection("users").updateOne({ _id: u._id }, { $set: { verifyTokenHash: hash, verifyTokenExpires: new Date(Date.now() + 24 * 3600 * 1000) } });
  await sendVerifyEmail(u.email, token);
  return NextResponse.json({ ok: true });
}
