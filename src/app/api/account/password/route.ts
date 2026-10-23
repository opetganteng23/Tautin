import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/ratelimit";
import { bad, unauthorized } from "@/lib/api";

const schema = z.object({ current: z.string().min(1), next: z.string().min(8, "Password baru minimal 8 karakter").max(200) });

export async function POST(req: Request) {
  const u = await getCurrentUser();
  if (!u) return unauthorized();
  if (!(await rateLimit(`pwchange:${u._id}`, 5, 3600))) return bad("Terlalu banyak percobaan", 429);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0].message);
  if (!(await verifyPassword(u.passwordHash, parsed.data.current))) return bad("Password saat ini salah", 403);
  const db = await getDb();
  await db.collection("users").updateOne({ _id: u._id }, { $set: { passwordHash: await hashPassword(parsed.data.next) } });
  return NextResponse.json({ ok: true });
}
