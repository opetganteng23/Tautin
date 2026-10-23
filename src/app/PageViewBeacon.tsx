"use client";
import { useEffect } from "react";

/** Halaman publik di-cache, jadi page view dicatat lewat beacon ini. */
export default function PageViewBeacon({ profileId }: { profileId: string }) {
  useEffect(() => {
    fetch("/api/pv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId }), keepalive: true }).catch(() => {});
  }, [profileId]);
  return null;
}
