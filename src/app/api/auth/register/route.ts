import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { hashPassword, newToken } from "@/lib/password";
import { isReserved } from "@/lib/reserved";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { sendVerifyEmail } from "@/lib/emails";
import type { User } from "@/lib/types";

const schema = z.object({
  email: z.string().email().max(254).transform((s) => s.toLowerCase()),
  username: z.string().regex(/^[a-z0-9_.]{3,30}$/i, "Username 3-30 karakter: huruf, angka, _ atau .").transform((s) => s.toLowerCase()),
  password: z.string().min(8, "Password minimal 8 karakter").max(200),
});

export async function POST(req: Request) {
  if (!(await rateLimit(`register:${clientIp(req)}`, 5, 3600))) {
    return NextResponse.json({ error: "Terlalu banyak percobaan, coba lagi nanti" }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { email, username, password } = parsed.data;
  if (await isReserved(username)) {
    return NextResponse.json({ error: "Username tidak tersedia" }, { status: 409 });
  }

  const { token, hash } = newToken();
  const db = await getDb();
  try {
    await db.collection<Omit<User, "_id">>("users").insertOne({
      email,
      username,
      passwordHash: await hashPassword(password),
      role: "user",
      status: "active",
      emailVerified: false,
      planId: null,
      planExpiresAt: null,
      trialUsed: false,
      createdAt: new Date(),
      verifyTokenHash: hash,
      verifyTokenExpires: new Date(Date.now() + 24 * 3600 * 1000),
    });
  } catch (e: unknown) {
    if ((e as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "Email atau username sudah dipakai" }, { status: 409 });
    }
    throw e;
  }
  await sendVerifyEmail(email, token);
  return NextResponse.json({ ok: true });
}
