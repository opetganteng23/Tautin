"use client";
import { useState } from "react";

export default function ReportForm({ username }: { username: string }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setMsg("");
    const body = Object.fromEntries(new FormData(form));
    const res = await fetch("/api/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg(data.error || "Terjadi kesalahan");
    form.reset();
    setMsg("Terima kasih, laporan Anda sudah kami terima.");
  }

  return (
    <form onSubmit={onSubmit}>
      <input name="username" placeholder="Username yang dilaporkan" defaultValue={username} required />
      <textarea name="reason" placeholder="Alasan laporan (spam, phishing, konten terlarang, dll.)" rows={4} required minLength={5} maxLength={500} />
      <input name="reporterEmail" type="email" placeholder="Email Anda (opsional)" />
      <button disabled={busy}>Kirim laporan</button>
      <div className="msg">{msg}</div>
    </form>
  );
}
