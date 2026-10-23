import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { recordEvent } from "@/lib/analytics";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import type { Profile } from "@/lib/types";
import { oid } from "@/lib/api";

/** Beacon page view dari halaman publik (halaman di-cache, jadi pencatatan lewat endpoint ini). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const id = oid(body?.profileId);
  if (!id || !(await rateLimit(`pv:${clientIp(req)}`, 120, 60))) return NextResponse.json({ ok: false });
  const db = await getDb();
  const profile = await db.collection<Profile>("profiles").findOne({ _id: id });
  if (profile) await recordEvent("view", profile._id, req).catch(() => {});
  return NextResponse.json({ ok: true });
}
