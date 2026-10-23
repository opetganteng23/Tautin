import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashToken } from "@/lib/password";
import type { User } from "@/lib/types";

export async function POST(req: Request) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  if (!token) return NextResponse.json({ error: "Token tidak valid" }, { status: 400 });
  const db = await getDb();
  const r = await db.collection<User>("users").updateOne(
    { verifyTokenHash: hashToken(token), verifyTokenExpires: { $gt: new Date() } },
    { $set: { emailVerified: true }, $unset: { verifyTokenHash: "", verifyTokenExpires: "" } }
  );
  if (!r.matchedCount) return NextResponse.json({ error: "Token tidak valid atau kedaluwarsa" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
