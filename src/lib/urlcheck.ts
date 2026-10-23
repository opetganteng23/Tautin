import { getDb } from "./db";
import { isUnsafeUrl } from "./safebrowsing";

const PRIVATE_HOST = /^(localhost|.*\.local|.*\.internal|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/i;

export async function isBlockedHost(host: string) {
  const db = await getDb();
  const parts = host.toLowerCase().split(".");
  const candidates = parts.map((_, i) => parts.slice(i).join(".")).filter((d) => d.includes("."));
  return (await db.collection("blocklist").countDocuments({ domain: { $in: candidates } })) > 0;
}

/** Validasi URL tujuan: hanya http(s), bukan alamat internal, bukan domain terblokir, lolos Safe Browsing. */
export async function checkUrl(raw: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const s = raw.trim();
  if (!s || s.length > 2048) return { ok: false, error: "URL tidak valid" };
  let u: URL;
  try { u = new URL(s); } catch { return { ok: false, error: "URL tidak valid" }; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { ok: false, error: "Hanya URL http/https yang diizinkan" };
  if (u.username || u.password) return { ok: false, error: "URL tidak boleh memuat kredensial" };
  if (PRIVATE_HOST.test(u.hostname) || !u.hostname.includes(".")) return { ok: false, error: "Alamat URL tidak diizinkan" };
  if (await isBlockedHost(u.hostname)) return { ok: false, error: "Domain ini diblokir" };
  if (await isUnsafeUrl(u.toString())) return { ok: false, error: "URL ditandai berbahaya oleh Google Safe Browsing" };
  return { ok: true, url: u.toString() };
}
