"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/** fetch JSON; melempar Error(pesan server) bila gagal. */
export async function api<T = Record<string, unknown>>(url: string, method = "GET", body?: unknown): Promise<T> {
  const r = await fetch(url, { method, headers: body !== undefined ? { "Content-Type": "application/json" } : undefined, body: body !== undefined ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error || "Terjadi kesalahan");
  return j as T;
}

export function useLoad<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    try { setData(await api<T>(url)); setError(""); } catch (e) { setError((e as Error).message); }
  }, [url]);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, reload, setData };
}

/** Pesan singkat (toast). */
export function useFlash() {
  const [msg, setMsg] = useState<{ text: string; err: boolean } | null>(null);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  const flash = useCallback((text: string, err = false) => {
    setMsg({ text, err });
    clearTimeout(t.current);
    t.current = setTimeout(() => setMsg(null), 3500);
  }, []);
  return { msg, flash };
}

export const idr = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
export const fmtDate = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";
