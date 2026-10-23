"use client";
import { useState } from "react";
import { api, fmtDate, idr, useFlash, useLoad } from "../clientapi";

type Tab = "stats" | "users" | "plans" | "themes" | "orders" | "reports" | "blocklist" | "settings";
const TABS: [Tab, string][] = [["stats", "Statistik"], ["users", "User"], ["plans", "Paket"], ["themes", "Tema"], ["orders", "Order"], ["reports", "Laporan"], ["blocklist", "Blocklist"], ["settings", "Pengaturan"]];
type Flash = (text: string, err?: boolean) => void;

export default function AdminApp() {
  const [tab, setTab] = useState<Tab>("stats");
  const { msg, flash } = useFlash();
  return (
    <main className="wide">
      <div className="tabs" role="tablist">
        {TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>)}
      </div>
      {tab === "stats" && <Stats />}
      {tab === "users" && <Users flash={flash} />}
      {tab === "plans" && <Plans flash={flash} />}
      {tab === "themes" && <Themes flash={flash} />}
      {tab === "orders" && <Orders />}
      {tab === "reports" && <Reports flash={flash} />}
      {tab === "blocklist" && <Blocklist flash={flash} />}
      {tab === "settings" && <SettingsTab flash={flash} />}
      {msg && <div className={`toast${msg.err ? " err" : ""}`} role="status">{msg.text}</div>}
    </main>
  );
}

async function attempt(flash: Flash, fn: () => Promise<unknown>, ok: string, after?: () => unknown) {
  try { await fn(); flash(ok); await after?.(); } catch (e) { flash((e as Error).message, true); }
}

/* ----------------------------- Statistik ---------------------------- */
function Stats() {
  const { data } = useLoad<Record<string, number>>("/api/admin/stats");
  if (!data) return <p className="hint">Memuat…</p>;
  const items: [string, string, boolean?][] = [
    ["users", "Total user"], ["paidUsers", "User berbayar aktif"], ["suspended", "User disuspend"], ["links", "Total link"], ["clicks", "Total klik"],
    ["openReports", "Laporan terbuka"], ["blocked", "Domain terblokir"], ["pendingOrders", "Order pending"], ["revenue", "Pendapatan total", true], ["revenue30", "Pendapatan 30 hari", true],
  ];
  return <div className="stats">{items.map(([k, label, money]) => <div className="stat" key={k}><b>{money ? idr(data[k]) : data[k]}</b><span>{label}</span></div>)}</div>;
}

/* -------------------------------- User ------------------------------ */
interface UserRow { id: string; email: string; username: string; role: string; status: string; emailVerified: boolean; plan: string; planExpiresAt: string | null; trialUsed: boolean; createdAt: string }
interface PlanRow { id: string; name: string; priceMonthly: number; priceYearly: number; maxLinks: number; analyticsLevel: string; allowedThemes: string[]; removeBranding: boolean; trialDays: number; isActive: boolean; isFree: boolean }
interface ThemeRow { id: string; name: string; isPremium: boolean; config: Record<string, unknown> }

function Users({ flash }: { flash: Flash }) {
  const [q, setQ] = useState("");
  const { data, reload } = useLoad<UserRow[]>(`/api/admin/users?q=${encodeURIComponent(q)}`);
  const plans = useLoad<PlanRow[]>("/api/admin/plans").data;
  const [sel, setSel] = useState<{ id: string; planId: string; days: number } | null>(null);

  const act = (id: string, body: Record<string, unknown>, ok: string) => attempt(flash, () => api("/api/admin/users", "PATCH", { id, ...body }), ok, reload);
  return (
    <>
      <input placeholder="Cari email atau username…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 12 }} />
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>User</th><th>Paket</th><th>Berakhir</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>{(data ?? []).map((u) => (
          <tr key={u.id}>
            <td><b>@{u.username}</b> {u.role === "admin" && <span className="badge">admin</span>}<br /><small>{u.email} {u.emailVerified ? "✓" : "(belum verifikasi)"}</small></td>
            <td>{u.plan}</td><td>{fmtDate(u.planExpiresAt)}</td>
            <td><span className={`badge ${u.status === "active" ? "ok" : "bad"}`}>{u.status}</span></td>
            <td><div className="row">
              {u.status === "active" ? <button className="sm danger" onClick={() => confirm(`Suspend @${u.username}?`) && act(u.id, { action: "suspend" }, "User disuspend")}>Suspend</button>
                : <button className="sm" onClick={() => act(u.id, { action: "activate" }, "User diaktifkan")}>Aktifkan</button>}
              <button className="sm ghost" onClick={() => setSel({ id: u.id, planId: plans?.find((p) => !p.isFree)?.id ?? "", days: 30 })}>Ubah paket</button>
              {u.trialUsed && <button className="sm ghost" onClick={() => act(u.id, { action: "resetTrial" }, "Jatah trial direset")}>Reset trial</button>}
            </div></td>
          </tr>
        ))}</tbody>
      </table></div>
      {sel && (
        <div className="card2" style={{ marginTop: 12 }}>
          <b>Ubah paket / beri trial</b>
          <div className="row" style={{ marginTop: 8 }}>
            <select value={sel.planId} onChange={(e) => setSel({ ...sel, planId: e.target.value })} style={{ width: 200 }}>
              <option value="">Free (turunkan)</option>
              {(plans ?? []).filter((p) => !p.isFree).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="number" min={1} max={3650} value={sel.days} onChange={(e) => setSel({ ...sel, days: Number(e.target.value) })} style={{ width: 110 }} aria-label="Hari" /> hari
            <button className="sm" onClick={() => act(sel.id, { action: sel.planId ? "grantTrial" : "setPlan", planId: sel.planId || null, days: sel.planId ? sel.days : undefined }, "Paket diubah").then(() => setSel(null))}>Terapkan</button>
            <button className="sm ghost" onClick={() => setSel(null)}>Batal</button>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------- Paket ------------------------------ */
const NEW_PLAN = { name: "", priceMonthly: 0, priceYearly: 0, maxLinks: 10, analyticsLevel: "basic", allowedThemes: [] as string[], removeBranding: false, trialDays: 0, isActive: true };

function Plans({ flash }: { flash: Flash }) {
  const { data, reload } = useLoad<PlanRow[]>("/api/admin/plans");
  const themes = useLoad<ThemeRow[]>("/api/admin/themes").data;
  const [f, setF] = useState<(typeof NEW_PLAN & { id?: string; isFree?: boolean }) | null>(null);
  const allThemes = f?.allowedThemes.includes("*");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f) return;
    const { id, isFree: _free, ...body } = f; void _free;
    await attempt(flash, () => (id ? api("/api/admin/plans", "PUT", { id, ...body }) : api("/api/admin/plans", "POST", body)), "Paket disimpan", async () => { setF(null); await reload(); });
  }
  const num = (k: "priceMonthly" | "priceYearly" | "maxLinks" | "trialDays") => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f!, [k]: Number(e.target.value) });

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}><p className="hint">Semua batas fitur dibaca dari sini. Tidak ada angka batas di kode.</p><button className="sm" onClick={() => setF({ ...NEW_PLAN })}>+ Paket baru</button></div>
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>Nama</th><th>Bulanan</th><th>Tahunan</th><th>Link</th><th>Analitik</th><th>Trial</th><th>Status</th><th /></tr></thead>
        <tbody>{(data ?? []).map((p) => (
          <tr key={p.id}><td><b>{p.name}</b> {p.isFree && <span className="badge">free</span>}</td><td>{idr(p.priceMonthly)}</td><td>{idr(p.priceYearly)}</td><td>{p.maxLinks}</td><td>{p.analyticsLevel}</td><td>{p.trialDays}h</td>
            <td><span className={`badge ${p.isActive ? "ok" : "bad"}`}>{p.isActive ? "aktif" : "nonaktif"}</span></td>
            <td><div className="row">
              <button className="sm ghost" onClick={() => setF({ ...p })}>Ubah</button>
              {!p.isFree && <button className="sm danger" onClick={() => confirm(`Hapus paket ${p.name}?`) && attempt(flash, () => api(`/api/admin/plans?id=${p.id}`, "DELETE"), "Paket dihapus", reload)}>Hapus</button>}
            </div></td></tr>
        ))}</tbody>
      </table></div>
      {f && (
        <form className="card2" style={{ marginTop: 12 }} onSubmit={save}>
          <b>{f.id ? "Ubah paket" : "Paket baru"}</b>
          <div className="grid2" style={{ marginTop: 8 }}>
            <label className="field">Nama<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></label>
            <label className="field">Harga bulanan (Rp)<input type="number" min={0} value={f.priceMonthly} onChange={num("priceMonthly")} disabled={f.isFree} /></label>
            <label className="field">Harga tahunan (Rp)<input type="number" min={0} value={f.priceYearly} onChange={num("priceYearly")} disabled={f.isFree} /></label>
            <label className="field">Maks. link aktif<input type="number" min={1} value={f.maxLinks} onChange={num("maxLinks")} /></label>
            <label className="field">Hari trial (0 = tanpa trial)<input type="number" min={0} value={f.trialDays} onChange={num("trialDays")} disabled={f.isFree} /></label>
            <label className="field">Analitik
              <select value={f.analyticsLevel} onChange={(e) => setF({ ...f, analyticsLevel: e.target.value })}>
                <option value="none">Total klik saja</option><option value="basic">Dasar (7/30 hari)</option><option value="full">Lengkap</option>
              </select>
            </label>
          </div>
          <div className="row" style={{ margin: "10px 0" }}>
            <label className="row"><input type="checkbox" checked={f.removeBranding} onChange={(e) => setF({ ...f, removeBranding: e.target.checked })} /> Hilangkan label Tautin</label>
            <label className="row"><input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} disabled={f.isFree} /> Aktif</label>
            <label className="row"><input type="checkbox" checked={!!allThemes} onChange={(e) => setF({ ...f, allowedThemes: e.target.checked ? ["*"] : [] })} /> Semua tema premium</label>
          </div>
          {!allThemes && (themes ?? []).some((t) => t.isPremium) && (
            <div className="row" style={{ marginBottom: 10 }}><small className="hint">Tema premium yang diizinkan:</small>
              {(themes ?? []).filter((t) => t.isPremium).map((t) => (
                <label key={t.id} className="row"><input type="checkbox" checked={f.allowedThemes.includes(t.id)} onChange={(e) => setF({ ...f, allowedThemes: e.target.checked ? [...f.allowedThemes, t.id] : f.allowedThemes.filter((x) => x !== t.id) })} /> {t.name}</label>
              ))}
            </div>
          )}
          <div className="row"><button className="sm">Simpan</button><button type="button" className="sm ghost" onClick={() => setF(null)}>Batal</button></div>
        </form>
      )}
    </>
  );
}

/* ------------------------------- Tema ------------------------------- */
const TEMPLATE = { bgType: "gradient", bg1: "#d6eaf8", bg2: "#ffffff", text: "#0f2a35", buttonBg: "#00809d", buttonText: "#ffffff", buttonRadius: 16, buttonStyle: "3d", font: "poppins", tilt: false };

function Themes({ flash }: { flash: Flash }) {
  const { data, reload } = useLoad<ThemeRow[]>("/api/admin/themes");
  const [f, setF] = useState<{ id?: string; name: string; isPremium: boolean; json: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f) return;
    let config: unknown;
    try { config = JSON.parse(f.json); } catch { return flash("JSON tidak valid", true); }
    const body = { name: f.name, isPremium: f.isPremium, config };
    await attempt(flash, () => (f.id ? api("/api/admin/themes", "PUT", { id: f.id, ...body }) : api("/api/admin/themes", "POST", body)), "Tema disimpan", async () => { setF(null); await reload(); });
  }
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}><p className="hint">Tema = konfigurasi JSON, bukan template kode. Tema premium dikunci per paket.</p><button className="sm" onClick={() => setF({ name: "", isPremium: false, json: JSON.stringify(TEMPLATE, null, 2) })}>+ Tema baru</button></div>
      <div className="themes">
        {(data ?? []).map((t) => {
          const c = t.config as { bg1: string; bg2: string; buttonBg: string };
          return (
            <div key={t.id} className="theme" style={{ cursor: "default" }}>
              <span className="sw" style={{ background: `linear-gradient(135deg, ${c.bg1}, ${c.bg2})` }}><i style={{ background: c.buttonBg }} /></span>
              {t.name} {t.isPremium && <span className="badge">Premium</span>}
              <div className="row" style={{ marginTop: 6 }}>
                <button className="sm ghost" onClick={() => setF({ id: t.id, name: t.name, isPremium: t.isPremium, json: JSON.stringify(t.config, null, 2) })}>Ubah</button>
                <button className="sm danger" onClick={() => confirm(`Hapus tema ${t.name}?`) && attempt(flash, () => api(`/api/admin/themes?id=${t.id}`, "DELETE"), "Tema dihapus", reload)}>Hapus</button>
              </div>
            </div>
          );
        })}
      </div>
      {f && (
        <form className="card2" style={{ marginTop: 12 }} onSubmit={save}>
          <div className="row"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Nama tema" required style={{ flex: 1 }} />
            <label className="row"><input type="checkbox" checked={f.isPremium} onChange={(e) => setF({ ...f, isPremium: e.target.checked })} /> Premium</label></div>
          <textarea rows={12} value={f.json} onChange={(e) => setF({ ...f, json: e.target.value })} spellCheck={false} style={{ fontFamily: "ui-monospace, monospace", marginTop: 8 }} />
          <p className="hint">bgType: solid | gradient | 3d · buttonStyle: solid | outline | 3d · font: poppins | serif | mono | system · warna format #rrggbb</p>
          <div className="row"><button className="sm">Simpan</button><button type="button" className="sm ghost" onClick={() => setF(null)}>Batal</button></div>
        </form>
      )}
    </>
  );
}

/* ------------------------------- Order ------------------------------ */
function Orders() {
  const { data } = useLoad<{ id: string; orderId: string; username: string; email: string; planName: string; period: string; amount: number; status: string; paymentType?: string; createdAt: string }[]>("/api/admin/orders");
  if (!data) return <p className="hint">Memuat…</p>;
  if (data.length === 0) return <p className="hint">Belum ada order.</p>;
  return (
    <div className="tbl-wrap"><table className="tbl">
      <thead><tr><th>Tanggal</th><th>Order</th><th>User</th><th>Paket</th><th>Jumlah</th><th>Metode</th><th>Status</th></tr></thead>
      <tbody>{data.map((o) => (
        <tr key={o.id}><td>{fmtDate(o.createdAt)}</td><td><small>{o.orderId}</small></td><td>@{o.username}</td><td>{o.planName} · {o.period === "yearly" ? "tahunan" : "bulanan"}</td><td>{idr(o.amount)}</td><td>{o.paymentType ?? "-"}</td>
          <td><span className={`badge ${o.status === "settlement" ? "ok" : o.status === "pending" ? "" : "bad"}`}>{o.status}</span></td></tr>
      ))}</tbody>
    </table></div>
  );
}

/* ------------------------------ Laporan ----------------------------- */
function Reports({ flash }: { flash: Flash }) {
  const { data, reload } = useLoad<{ id: string; username: string; reason: string; reporterEmail: string; status: string; createdAt: string }[]>("/api/admin/reports");
  if (!data) return <p className="hint">Memuat…</p>;
  if (data.length === 0) return <p className="hint">Belum ada laporan.</p>;
  const set = (id: string, status: string) => attempt(flash, () => api("/api/admin/reports", "PATCH", { id, status }), "Status laporan diubah", reload);
  return (
    <ul className="list">{data.map((r) => (
      <li key={r.id} className="item" style={{ alignItems: "flex-start" }}>
        <div className="info" style={{ whiteSpace: "normal" }}>
          <b style={{ whiteSpace: "normal" }}><a href={`/${r.username}`} target="_blank" rel="noreferrer">@{r.username}</a> <span className={`badge ${r.status === "open" ? "bad" : "ok"}`}>{r.status}</span></b>
          <small style={{ whiteSpace: "normal" }}>{r.reason}</small>
          <small>{fmtDate(r.createdAt)} {r.reporterEmail && `· ${r.reporterEmail}`}</small>
        </div>
        <select value={r.status} onChange={(e) => set(r.id, e.target.value)} style={{ width: 140 }} aria-label="Status laporan">
          <option value="open">open</option><option value="reviewed">reviewed</option><option value="actioned">actioned</option><option value="dismissed">dismissed</option>
        </select>
      </li>
    ))}</ul>
  );
}

/* ------------------------------ Blocklist --------------------------- */
function Blocklist({ flash }: { flash: Flash }) {
  const { data, reload } = useLoad<{ id: string; domain: string; reason: string; createdAt: string }[]>("/api/admin/blocklist");
  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    await attempt(flash, () => api("/api/admin/blocklist", "POST", body), "Domain diblokir", async () => { form.reset(); await reload(); });
  }
  return (
    <>
      <form className="row" onSubmit={add} style={{ marginBottom: 12 }}>
        <input name="domain" placeholder="contoh: situs-berbahaya.com" required style={{ flex: 1, minWidth: 200 }} />
        <input name="reason" placeholder="Alasan" style={{ flex: 1, minWidth: 160 }} />
        <button className="sm">Blokir</button>
      </form>
      <p className="hint">Subdomain ikut terblokir. Link ke domain ini ditolak saat dibuat dan saat diklik. Google Safe Browsing aktif otomatis bila GOOGLE_SAFE_BROWSING_KEY diset di server.</p>
      <ul className="list">{(data ?? []).map((b) => (
        <li key={b.id} className="item"><div className="info"><b>{b.domain}</b><small>{b.reason || "-"} · {fmtDate(b.createdAt)}</small></div>
          <button className="sm danger" onClick={() => attempt(flash, () => api(`/api/admin/blocklist?id=${b.id}`, "DELETE"), "Blokir dicabut", reload)}>Cabut</button></li>
      ))}</ul>
    </>
  );
}

/* ------------------------------ Pengaturan -------------------------- */
function SettingsTab({ flash }: { flash: Flash }) {
  const { data, reload } = useLoad<{ freeModeGlobal: boolean; paymentsEnabled: boolean; gracePeriodDays: number; reservedUsernames: string[] }>("/api/admin/settings");
  const [f, setF] = useState<{ freeModeGlobal: boolean; paymentsEnabled: boolean; gracePeriodDays: number; reserved: string } | null>(null);
  if (data && !f) setF({ freeModeGlobal: data.freeModeGlobal, paymentsEnabled: data.paymentsEnabled, gracePeriodDays: data.gracePeriodDays, reserved: data.reservedUsernames.join(", ") });
  if (!f) return <p className="hint">Memuat…</p>;
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    return attempt(flash, () => api("/api/admin/settings", "PUT", {
      freeModeGlobal: f.freeModeGlobal, paymentsEnabled: f.paymentsEnabled, gracePeriodDays: f.gracePeriodDays,
      reservedUsernames: f.reserved.split(/[\s,]+/).filter(Boolean),
    }), "Pengaturan disimpan", reload);
  };
  return (
    <form className="card2" onSubmit={save}>
      <label className="row" style={{ marginBottom: 10 }}><input type="checkbox" checked={f.paymentsEnabled} onChange={(e) => setF({ ...f, paymentsEnabled: e.target.checked })} /> <b>Pembayaran dibuka</b> (Midtrans). Mati = tombol Bayar nonaktif dan order baru ditolak.</label>
      <label className="row"><input type="checkbox" checked={f.freeModeGlobal} onChange={(e) => setF({ ...f, freeModeGlobal: e.target.checked })} /> <b>Mode gratis global</b> (buka semua fitur premium untuk semua user, sementara)</label>
      <label className="field" style={{ margin: "12px 0", maxWidth: 260 }}>Masa tenggang setelah kedaluwarsa (hari)
        <input type="number" min={0} max={90} value={f.gracePeriodDays} onChange={(e) => setF({ ...f, gracePeriodDays: Number(e.target.value) })} />
      </label>
      <label className="field">Username yang dicadangkan (pisahkan dengan koma)
        <textarea rows={4} value={f.reserved} onChange={(e) => setF({ ...f, reserved: e.target.value })} />
      </label>
      <p className="hint">Hati-hati: menghapus nama rute sistem (admin, api, login, dst.) dari daftar ini bisa membuat user mengambil nama yang bentrok dengan halaman situs.</p>
      <button>Simpan</button>
    </form>
  );
}
