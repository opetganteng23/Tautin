"use client";
import { useState, type ReactNode } from "react";

export interface Field { name: string; type?: string; placeholder: string; autoComplete?: string }

export default function AuthForm({
  endpoint, fields, submit, successMessage, redirectTo, extra, hidden,
}: {
  endpoint: string;
  fields: Field[];
  submit: string;
  successMessage?: string;
  redirectTo?: string;
  extra?: ReactNode;
  hidden?: Record<string, string>;
}) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const body = { ...hidden, ...Object.fromEntries(new FormData(e.currentTarget)) };
    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg(data.error || "Terjadi kesalahan");
    if (redirectTo) {
      window.location.href = data.role === "admin" && redirectTo === "/dashboard" ? "/admin" : redirectTo;
      return;
    }
    setMsg(successMessage || "Berhasil");
  }

  return (
    <form onSubmit={onSubmit}>
      {fields.map((f) => (
        <input key={f.name} name={f.name} type={f.type || "text"} placeholder={f.placeholder} autoComplete={f.autoComplete} required />
      ))}
      <button disabled={busy}>{submit}</button>
      <div className="msg">{msg}</div>
      {extra}
    </form>
  );
}
