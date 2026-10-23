import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { hashPassword, hashToken } from "@/lib/password";
import type { User } from "@/lib/types";

const schema = z.object({ token: z.string().min(1), password: z.string().min(8, "Password minimal 8 karakter").max(200) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const db = await getDb();
  const r = await db.collection<User>("users").updateOne(
    { resetTokenHash: hashToken(parsed.data.token), resetTokenExpires: { $gt: new Date() } },
    {
      $set: { passwordHash: await hashPassword(parsed.data.password), emailVerified: true },
      $unset: { resetTokenHash: "", resetTokenExpires: "" },
    }
  );
  if (!r.matchedCount) return NextResponse.json({ error: "Token tidak valid atau kedaluwarsa" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
