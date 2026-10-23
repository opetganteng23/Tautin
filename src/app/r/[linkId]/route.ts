import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { recordEvent } from "@/lib/analytics";
import { isBlockedHost } from "@/lib/urlcheck";
import { oid } from "@/lib/api";
import type { LinkDoc, User } from "@/lib/types";

const gone = (msg: string, status: number) => new NextResponse(msg, { status, headers: { "content-type": "text/plain; charset=utf-8" } });

/** Redirect + catat klik. Domain diperiksa ulang terhadap blocklist saat klik. */
export async function GET(req: Request, { params }: { params: Promise<{ linkId: string }> }) {
  const id = oid((await params).linkId);
  if (!id) return gone("Link tidak ditemukan", 404);
  const db = await getDb();
  const link = await db.collection<LinkDoc>("links").findOne({ _id: id });
  if (!link || !link.isActive || !link.url) return gone("Link tidak ditemukan atau dinonaktifkan", 404);
  const user = await db.collection<User>("users").findOne({ _id: link.userId }, { projection: { status: 1 } });
  if (!user || user.status !== "active") return gone("Link tidak tersedia", 410);
  let host = "";
  try { host = new URL(link.url).hostname; } catch { return gone("Link tidak valid", 410); }
  if (await isBlockedHost(host)) return gone("Tujuan link ini telah diblokir", 410);

  try {
    const profile = await db.collection("profiles").findOne({ userId: link.userId }, { projection: { _id: 1 } });
    if (profile && (await recordEvent("click", profile._id, req, link._id))) {
      await db.collection("links").updateOne({ _id: link._id }, { $inc: { clickCount: 1 } });
    }
  } catch (e) {
    console.error("catat klik gagal", e); // jangan menghalangi redirect
  }
  return NextResponse.redirect(link.url, 302);
}
