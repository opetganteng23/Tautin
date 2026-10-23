import { getDb } from "./db";

// Default awal; admin dapat mengubah lewat settings.reservedUsernames.
export const DEFAULT_RESERVED = [
  "admin", "api", "r", "login", "register", "dashboard", "pricing", "harga", "settings",
  "verify-email", "forgot-password", "reset-password", "about", "terms", "privacy", "support",
  "help", "static", "_next", "tautin", "www", "app", "root", "null", "undefined",
];

export async function isReserved(username: string) {
  const db = await getDb();
  const s = await db.collection("settings").findOne({});
  const list: string[] = s?.reservedUsernames ?? DEFAULT_RESERVED;
  return list.includes(username.toLowerCase());
}
