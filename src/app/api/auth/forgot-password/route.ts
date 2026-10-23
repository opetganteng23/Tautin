import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { newToken } from "@/lib/password";
import { sendResetEmail } from "@/lib/emails";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import type { User } from "@/lib/types";

export async function POST(req: Request) {
  if (!(await rateLimit(`forgot:${clientIp(req)}`, 5, 3600))) {
    return NextResponse.json({ error: "Terlalu banyak percobaan" }, { status: 429 });
  }
  const parsed = z.object({ email: z.string().email() }).safeParse(await req.json().catch(() => null));
  if (parsed.success) {
    const db = await getDb();
    const { token, hash } = newToken();
    const r = await db.collection<User>("users").updateOne(
      { email: parsed.data.email.toLowerCase(), status: "active" },
      { $set: { resetTokenHash: hash, resetTokenExpires: new Date(Date.now() + 3600 * 1000) } }
    );
    if (r.matchedCount) await sendResetEmail(parsed.data.email.toLowerCase(), token);
  }
  // Respons sama agar tidak membocorkan email terdaftar
  return NextResponse.json({ ok: true });
}
