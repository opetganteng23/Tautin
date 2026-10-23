import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { effectivePlan, themeAllowed } from "@/lib/plans";
import { ensureProfile, overridesSchema, resolveTheme } from "@/lib/profile";
import { checkUrl } from "@/lib/urlcheck";
import { bad, oid, unauthorized } from "@/lib/api";
import type { Theme } from "@/lib/types";

export async function GET() {
  const u = await getCurrentUser();
  if (!u) return unauthorized();
  const db = await getDb();
  const profile = await ensureProfile(u);
  const { plan } = await effectivePlan(u);
  const themes = await db.collection<Theme>("themes").find().sort({ isPremium: 1, _id: 1 }).toArray();
  const { theme, config } = await resolveTheme(profile, plan);
  return NextResponse.json({
    username: u.username,
    displayName: profile.displayName,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    themeId: theme?._id.toString() ?? null,
    overrides: profile.themeOverrides ?? {},
    config,
    themes: themes.map((t) => ({ id: t._id.toString(), name: t.name, isPremium: t.isPremium, locked: !themeAllowed(plan, t), config: t.config })),
  });
}

const schema = z.object({
  displayName: z.string().trim().min(1).max(60),
  bio: z.string().trim().max(300),
  avatarUrl: z.string().trim().max(2048),
  themeId: z.string().nullable(),
  themeOverrides: overridesSchema,
});

export async function PUT(req: Request) {
  const u = await getCurrentUser();
  if (!u) return unauthorized();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(parsed.error.issues[0].message);
  const d = parsed.data;

  let avatarUrl = "";
  if (d.avatarUrl) {
    const c = await checkUrl(d.avatarUrl);
    if (!c.ok) return bad(`Avatar: ${c.error}`);
    avatarUrl = c.url;
  }

  const db = await getDb();
  let themeId = null;
  if (d.themeId) {
    themeId = oid(d.themeId);
    const theme = themeId ? await db.collection<Theme>("themes").findOne({ _id: themeId }) : null;
    if (!theme) return bad("Tema tidak ditemukan");
    const { plan } = await effectivePlan(u);
    if (!themeAllowed(plan, theme)) return bad("Tema ini tidak tersedia di paket Anda", 403);
  }
  await ensureProfile(u);
  await db.collection("profiles").updateOne(
    { userId: u._id },
    { $set: { displayName: d.displayName, bio: d.bio, avatarUrl, themeId, themeOverrides: d.themeOverrides } }
  );
  revalidatePath(`/${u.username}`);
  return NextResponse.json({ ok: true });
}
