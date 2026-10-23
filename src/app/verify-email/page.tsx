import Shell from "../Shell";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { hashToken } from "@/lib/password";
import type { User } from "@/lib/types";

export default async function Verify({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  let ok = false;
  if (token) {
    const db = await getDb();
    const r = await db.collection<User>("users").updateOne(
      { verifyTokenHash: hashToken(token), verifyTokenExpires: { $gt: new Date() } },
      { $set: { emailVerified: true }, $unset: { verifyTokenHash: "", verifyTokenExpires: "" } }
    );
    ok = r.matchedCount > 0;
  }
  return (
    <Shell><main>
      <h1>{ok ? "Email terverifikasi" : "Link tidak valid atau kedaluwarsa"}</h1>
      <Link href="/login">Masuk</Link>
    </main></Shell>
  );
}
