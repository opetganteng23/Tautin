import type { Db } from "mongodb";
import { DEFAULT_RESERVED } from "./seed-constants";
import type { ThemeConfig } from "./types";

const base: ThemeConfig = {
  bgType: "gradient", bg1: "#d6eaf8", bg2: "#ffffff", text: "#0f2a35",
  buttonBg: "#00809d", buttonText: "#ffffff", buttonRadius: 16, buttonStyle: "3d",
  font: "poppins", tilt: false,
};

const THEMES: { name: string; isPremium: boolean; config: ThemeConfig }[] = [
  { name: "AILO", isPremium: false, config: base },
  { name: "Sunset", isPremium: false, config: { ...base, bg1: "#ffd8c2", bg2: "#fff7f0", text: "#3a1424", buttonBg: "#d6336c" } },
  { name: "Polos Gelap", isPremium: false, config: { ...base, bgType: "solid", bg1: "#111827", bg2: "#111827", text: "#f3f4f6", buttonBg: "#374151", buttonStyle: "solid" } },
  { name: "Neon 3D", isPremium: true, config: { ...base, bgType: "3d", bg1: "#0b1330", bg2: "#1b1060", text: "#e8eeff", buttonBg: "#4cc9f0", buttonText: "#07122e", tilt: true } },
  { name: "Mint Glass", isPremium: true, config: { ...base, bgType: "3d", bg1: "#c9f2e3", bg2: "#eafaf4", text: "#0d2e25", buttonBg: "#0b8f6a", buttonRadius: 28, tilt: true } },
];

/** Data awal bila koleksi masih kosong. Semua nilai bisa diubah admin dari dashboard. */
export async function ensureDefaults(db: Db) {
  const plans = db.collection("plans");
  if ((await plans.countDocuments()) === 0) {
    await plans.insertMany([
      { name: "Free", priceMonthly: 0, priceYearly: 0, maxLinks: 5, analyticsLevel: "none", allowedThemes: [], removeBranding: false, trialDays: 0, isActive: true, isFree: true },
      { name: "Pro", priceMonthly: 29000, priceYearly: 290000, maxLinks: 50, analyticsLevel: "full", allowedThemes: ["*"], removeBranding: true, trialDays: 7, isActive: true, isFree: false },
    ]);
  }
  const themes = db.collection("themes");
  if ((await themes.countDocuments()) === 0) await themes.insertMany(THEMES);
  const settings = db.collection("settings");
  if ((await settings.countDocuments()) === 0) {
    await settings.insertOne({ freeModeGlobal: false, reservedUsernames: DEFAULT_RESERVED, gracePeriodDays: 7 });
  }
}
