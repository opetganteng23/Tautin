import { z } from "zod";
import { getDb } from "./db";
import { themeAllowed } from "./plans";
import type { Plan, Profile, Theme, ThemeConfig, User } from "./types";

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);

/** Skema ketat: nilai tema masuk ke CSS inline, jadi hanya bentuk yang dikenal yang lolos. */
export const configSchema = z.object({
  bgType: z.enum(["solid", "gradient", "3d"]),
  bg1: hex, bg2: hex, text: hex, buttonBg: hex, buttonText: hex,
  buttonRadius: z.number().min(0).max(40),
  buttonStyle: z.enum(["solid", "outline", "3d"]),
  font: z.enum(["poppins", "serif", "mono", "system"]),
  tilt: z.boolean(),
});

export const overridesSchema = configSchema.pick({
  bg1: true, bg2: true, text: true, buttonBg: true, buttonText: true, buttonRadius: true, buttonStyle: true, font: true,
}).partial();

const FALLBACK: ThemeConfig = {
  bgType: "gradient", bg1: "#d6eaf8", bg2: "#ffffff", text: "#0f2a35", buttonBg: "#00809d", buttonText: "#ffffff",
  buttonRadius: 16, buttonStyle: "3d", font: "poppins", tilt: false,
};

export async function ensureProfile(user: Pick<User, "_id" | "username">): Promise<Profile> {
  const db = await getDb();
  await db.collection("profiles").updateOne(
    { userId: user._id },
    { $setOnInsert: { userId: user._id, displayName: user.username, bio: "", avatarUrl: "", themeId: null, themeOverrides: {}, customDomain: null } },
    { upsert: true }
  );
  return (await db.collection<Profile>("profiles").findOne({ userId: user._id }))!;
}

/** Tema aktif profil: tema pilihan bila paket mengizinkan, kalau tidak tema gratis pertama; lalu timpa dengan override. */
export async function resolveTheme(profile: Pick<Profile, "themeId" | "themeOverrides">, plan: Plan) {
  const db = await getDb();
  const themes = db.collection<Theme>("themes");
  let theme: Theme | null = profile.themeId ? await themes.findOne({ _id: profile.themeId }) : null;
  if (!theme || !themeAllowed(plan, theme)) theme = await themes.find({ isPremium: false }).sort({ _id: 1 }).limit(1).next();
  const base = configSchema.safeParse(theme?.config);
  const over = overridesSchema.safeParse(profile.themeOverrides ?? {});
  return { theme, config: { ...FALLBACK, ...(base.success ? base.data : {}), ...(over.success ? over.data : {}) } as ThemeConfig };
}
