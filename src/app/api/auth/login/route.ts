import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import type { User } from "@/lib/types";

const schema = z.object({ email: z.string().email().transform((s) => s.toLowerCase()), password: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Email atau password salah" }, { status: 400 });
  const { email, password } = parsed.data;

  const ok =
    (await rateLimit(`login-ip:${clientIp(req)}`, 20, 900)) && (await rateLimit(`login-email:${email}`, 8, 900));
  if (!ok) return NextResponse.json({ error: "Terlalu banyak percobaan, coba lagi 15 menit lagi" }, { status: 429 });

  const db = await getDb();
  const user = await db.collection<User>("users").findOne({ email });
  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
  }
  if (user.status !== "active") return NextResponse.json({ error: "Akun ditangguhkan" }, { status: 403 });
  if (!user.emailVerified) return NextResponse.json({ error: "Email belum diverifikasi" }, { status: 403 });

  await createSession(user);
  return NextResponse.json({ ok: true, role: user.role });
}
