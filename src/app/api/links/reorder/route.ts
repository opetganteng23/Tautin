import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { bad, oid, unauthorized } from "@/lib/api";

export async function POST(req: Request) {
  const u = await getCurrentUser();
  if (!u) return unauthorized();
  const parsed = z.object({ ids: z.array(z.string()).max(500) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad("Data tidak valid");
  const ops = parsed.data.ids.flatMap((s, order) => {
    const _id = oid(s);
    return _id ? [{ updateOne: { filter: { _id, userId: u._id }, update: { $set: { order } } } }] : [];
  });
  if (ops.length) await (await getDb()).collection("links").bulkWrite(ops);
  revalidatePath(`/${u.username}`);
  return NextResponse.json({ ok: true });
}
