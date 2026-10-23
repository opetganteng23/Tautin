"use client";
import { useEffect, useState } from "react";
import { api, fmtDate, idr, useFlash, useLoad } from "../clientapi";

type Tab = "links" | "profile" | "analytics" | "plan" | "account";
const TABS: [Tab, string][] = [["links", "Link"], ["profile", "Profil & Tema"], ["analytics", "Analitik"], ["plan", "Langganan"], ["account", "Akun"]];

type Flash = (text: string, err?: boolean) => void;

export default function DashboardApp({ username }: { username: string }) {
  const [tab, setTab] = useState<Tab>("links");
  const { msg, flash } = useFlash();
  return (
    <main className="wide">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Halo, @{username}</h1>
        <a className="btn alt" style={{ padding: "8px 14px" }} href={`/${username}`} target="_blank" rel="noreferrer">Lihat halaman saya ↗</a>
      </div>
      <div className="tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {tab === "links" && <LinksTab flash={flash} />}
      {tab === "profile" && <ProfileTab flash={flash} username={username} />}
      {tab === "analytics" && <AnalyticsTab />}
      {tab === "plan" && <PlanTab flash={flash} />}
      {tab === "account" && <AccountTab flash={flash} />}
      {msg && <div className={`toast${msg.err ? " err" : ""}`} role="status">{msg.text}</div>}
    </main>
  );
}

/* ------------------------------ Link ------------------------------ */
interface LinkItem { id: string; type: "link" | "header" | "social"; title: string; url: string; isActive: boolean; clickCount: number; disabledByPlan: boolean }
interface LinksData { maxLinks: number; used: number; links: LinkItem[] }

function LinksTab({ flash }: { flash: Flash }) {
  const { data, reload, setData } = useLoad<LinksData>("/api/links");
  const [form, setForm] = useState({ type: "link", title: "", url: "" });
  const [editing, setEditing] = useState<string | null>(null);
  const [edit, setEdit] = useState({ title: "", url: "" });
  const [dragId, setDragId] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>, ok?: string) {
    try { await fn(); if (ok) flash(ok); await reload(); } catch (e) { flash((e as Error).message, true); }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await run(async () => { await api("/api/links", "POST", form); setForm({ ...form, title: "", url: "" }); }, "Link ditambahkan");
  }

  async function reorder(ids: string[]) {
    if (!data) return;
    const byId = new Map(data.links.map((l) => [l.id, l]));
    setData({ ...data, links: ids.map((i) => byId.get(i)!).filter(Boolean) });
    await run(() => api("/api/links/reorder", "POST", { ids }));
  }
  const move = (i: number, d: number) => {
    if (!data) return;
    const ids = data.links.map((l) => l.id);
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorder(ids);
  };
  function drop(targetId: string) {
    if (!data || !dragId || dragId === targetId) return;
    const ids = data.links.map((l) => l.id).filter((i) => i !== dragId);
    ids.splice(ids.indexOf(targetId), 0, dragId);
    setDragId(null);
    reorder(ids);
  }

  if (!data) return <p className="hint">Memuat…</p>;
  return (
    <>
      <p className="hint">Link aktif: <b>{data.used}</b> / {data.maxLinks}. Seret ☰ atau pakai panah untuk mengurutkan.</p>
      <form onSubmit={add} className="card2" style={{ marginBottom: 14 }}>
        <div className="row">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ width: 130 }} aria-label="Jenis">
            <option value="link">Link</option>
            <option value="social">Sosial</option>
            <option value="header">Judul bagian</option>
          </select>
          <input className="grow" placeholder="Judul tombol" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={100} style={{ flex: 1, minWidth: 140 }} />
          {form.type !== "header" && (
            <input placeholder="https://…" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required type="url" style={{ flex: 2, minWidth: 180 }} />
          )}
          <button className="sm" type="submit">Tambah</button>
        </div>
      </form>

      <ul className="list">
        {data.links.map((l, i) => (
          <li key={l.id} className={`item${l.isActive ? "" : " off"}${dragId === l.id ? " drag" : ""}`} draggable onDragStart={() => setDragId(l.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => drop(l.id)} onDragEnd={() => setDragId(null)}>
            <span className="grip" aria-hidden>☰</span>
            {editing === l.id ? (
              <form className="row grow" style={{ flex: 1 }} onSubmit={(e) => { e.preventDefault(); run(async () => { await api(`/api/links/${l.id}`, "PATCH", l.type === "header" ? { title: edit.title } : edit); setEditing(null); }, "Tersimpan"); }}>
                <input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} required maxLength={100} style={{ flex: 1, minWidth: 120 }} />
                {l.type !== "header" && <input value={edit.url} onChange={(e) => setEdit({ ...edit, url: e.target.value })} required type="url" style={{ flex: 2, minWidth: 160 }} />}
                <button className="sm">Simpan</button>
                <button type="button" className="sm ghost" onClick={() => setEditing(null)}>Batal</button>
              </form>
            ) : (
              <>
                <div className="info">
                  <b>{l.type === "header" ? `— ${l.title} —` : l.title} {l.disabledByPlan && <span className="badge bad">nonaktif: melebihi batas paket</span>}</b>
                  {l.type !== "header" && <small>{l.url}</small>}
                </div>
                {l.type !== "header" && <span className="badge" title="Jumlah klik">{l.clickCount} klik</span>}
                <button className="sm ghost" aria-label="Naik" onClick={() => move(i, -1)}>↑</button>
                <button className="sm ghost" aria-label="Turun" onClick={() => move(i, 1)}>↓</button>
                <label title="Aktif" className="row" style={{ gap: 4 }}>
                  <input type="checkbox" checked={l.isActive} onChange={(e) => run(() => api(`/api/links/${l.id}`, "PATCH", { isActive: e.target.checked }))} />
                </label>
                <button className="sm ghost" onClick={() => { setEditing(l.id); setEdit({ title: l.title, url: l.url }); }}>Ubah</button>
                <button className="sm danger" onClick={() => { if (confirm(`Hapus "${l.title}"?`)) run(() => api(`/api/links/${l.id}`, "DELETE"), "Dihapus"); }}>Hapus</button>
              </>
            )}
          </li>
        ))}
      </ul>
      {data.links.length === 0 && <p className="hint">Belum ada link. Tambahkan yang pertama di atas.</p>}
    </>
  );
}

/* ------------------------- Profil & Tema -------------------------- */
interface Cfg { bgType: string; bg1: string; bg2: string; text: string; buttonBg: string; buttonText: string; buttonRadius: number; buttonStyle: string; font: string; tilt: boolean }
interface ProfileData {
  displayName: string; bio: string; avatarUrl: string; themeId: string | null; overrides: Partial<Cfg>; config: Cfg;
  themes: { id: string; name: string; isPremium: boolean; locked: boolean; config: Cfg }[];
}

function ProfileTab({ flash, username }: { flash: Flash; username: string }) {
  const { data, reload } = useLoad<ProfileData>("/api/profile");
  const [f, setF] = useState<{ displayName: string; bio: string; avatarUrl: string; themeId: string | null; overrides: Partial<Cfg> } | null>(null);
  useEffect(() => { if (data && !f) setF({ displayName: data.displayName, bio: data.bio, avatarUrl: data.avatarUrl, themeId: data.themeId, overrides: data.overrides }); }, [data, f]);
  if (!data || !f) return <p className="hint">Memuat…</p>;

  const base = data.themes.find((t) => t.id === f.themeId)?.config ?? data.config;
  const eff: Cfg = { ...base, ...f.overrides };
  const setO = (k: keyof Cfg, v: string | number) => setF({ ...f, overrides: { ...f.overrides, [k]: v } });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/profile", "PUT", { displayName: f!.displayName, bio: f!.bio, avatarUrl: f!.avatarUrl, themeId: f!.themeId, themeOverrides: f!.overrides });
      flash("Profil disimpan");
      await reload();
    } catch (err) { flash((err as Error).message, true); }
  }

  return (
    <form onSubmit={save}>
      <div className="grid2">
        <label className="field">Nama tampilan<input value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} required maxLength={60} /></label>
        <label className="field">URL foto profil (opsional)<input type="url" value={f.avatarUrl} onChange={(e) => setF({ ...f, avatarUrl: e.target.value })} placeholder="https://…" /></label>
      </div>
      <label className="field" style={{ marginTop: 12 }}>Bio<textarea rows={3} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} maxLength={300} /></label>

      <h2 className="sec">Tema</h2>
      <div className="themes">
        {data.themes.map((t) => (
          <button type="button" key={t.id} className="theme" aria-pressed={f.themeId === t.id} disabled={t.locked} onClick={() => setF({ ...f, themeId: t.id })} title={t.locked ? "Tersedia di paket berbayar" : t.name}>
            <span className="sw" style={{ background: `linear-gradient(135deg, ${t.config.bg1}, ${t.config.bg2})` }}><i style={{ background: t.config.buttonBg }} /></span>
            {t.name} {t.isPremium && <span className="badge">{t.locked ? "🔒 Premium" : "Premium"}</span>}
          </button>
        ))}
      </div>

      <h2 className="sec">Sesuaikan</h2>
      <div className="row">
        {([["bg1", "Latar 1"], ["bg2", "Latar 2"], ["text", "Teks"], ["buttonBg", "Tombol"], ["buttonText", "Teks tombol"]] as [keyof Cfg, string][]).map(([k, label]) => (
          <label key={k} className="field" style={{ justifyItems: "start" }}>{label}<input type="color" value={String(eff[k])} onChange={(e) => setO(k, e.target.value)} /></label>
        ))}
        <label className="field">Sudut tombol ({eff.buttonRadius}px)<input type="range" min={0} max={40} value={eff.buttonRadius} onChange={(e) => setO("buttonRadius", Number(e.target.value))} /></label>
        <label className="field">Gaya tombol
          <select value={eff.buttonStyle} onChange={(e) => setO("buttonStyle", e.target.value)}>
            <option value="3d">3D</option><option value="solid">Polos</option><option value="outline">Garis</option>
          </select>
        </label>
        <label className="field">Font
          <select value={eff.font} onChange={(e) => setO("font", e.target.value)}>
            <option value="poppins">Poppins</option><option value="system">Sistem</option><option value="serif">Serif</option><option value="mono">Mono</option>
          </select>
        </label>
      </div>
      <div className="row" style={{ marginTop: 14 }}>
        <button type="submit">Simpan</button>
        <button type="button" className="ghost sm" onClick={() => setF({ ...f, overrides: {} })}>Reset penyesuaian</button>
        <a href={`/${username}`} target="_blank" rel="noreferrer">Lihat hasil ↗</a>
      </div>
      <p className="hint">Halaman publik diperbarui otomatis setelah disimpan.</p>
    </form>
  );
}

/* ----------------------------- Analitik ---------------------------- */
interface Stat { name: string; n: number }
interface AnalyticsData {
  level: "none" | "basic" | "full"; totalClicks: number; perLink: { id: string; title: string; clicks: number }[];
  series?: { date: string; views: number; clicks: number }[]; views7?: number; views30?: number; clicks7?: number; clicks30?: number;
  referrers?: Stat[]; devices?: Stat[]; countries?: Stat[];
}

function AnalyticsTab() {
  const { data } = useLoad<AnalyticsData>("/api/analytics");
  if (!data) return <p className="hint">Memuat…</p>;
  return (
    <>
      <div className="stats">
        <div className="stat"><b>{data.totalClicks}</b><span>Total klik</span></div>
        {data.level !== "none" && (
          <>
            <div className="stat"><b>{data.views7}</b><span>Kunjungan 7 hari</span></div>
            <div className="stat"><b>{data.views30}</b><span>Kunjungan 30 hari</span></div>
            <div className="stat"><b>{data.clicks7}</b><span>Klik 7 hari</span></div>
            <div className="stat"><b>{data.clicks30}</b><span>Klik 30 hari</span></div>
          </>
        )}
      </div>
      {data.level === "none" && <p className="hint">Paket Anda hanya menampilkan total klik. Upgrade di tab Langganan untuk statistik harian.</p>}
      {data.series && <Chart series={data.series} />}
      <h2 className="sec">Klik per link</h2>
      <ul className="list">
        {data.perLink.map((l) => <li key={l.id} className="item"><div className="info"><b>{l.title}</b></div><span className="badge">{l.clicks} klik</span></li>)}
      </ul>
      {data.level === "full" && (
        <div className="grid2" style={{ marginTop: 10 }}>
          <Breakdown title="Sumber kunjungan" rows={data.referrers} />
          <Breakdown title="Perangkat" rows={data.devices} />
          <Breakdown title="Negara" rows={data.countries} />
        </div>
      )}
    </>
  );
}

function Breakdown({ title, rows }: { title: string; rows?: Stat[] }) {
  return (
    <div className="card2">
      <b>{title}</b>
      {(rows ?? []).length === 0 && <p className="hint">Belum ada data.</p>}
      {(rows ?? []).map((r) => <div key={r.name} className="row" style={{ justifyContent: "space-between" }}><span>{r.name}</span><b>{r.n}</b></div>)}
    </div>
  );
}

function Chart({ series }: { series: { date: string; views: number; clicks: number }[] }) {
  const max = Math.max(1, ...series.map((d) => Math.max(d.views, d.clicks)));
  const w = 600, h = 140, bw = w / series.length;
  const pts = series.map((d, i) => `${i * bw + bw / 2},${h - (d.clicks / max) * (h - 10)}`).join(" ");
  return (
    <div className="card2">
      <div className="row" style={{ justifyContent: "space-between" }}><b>30 hari terakhir</b><small className="hint"><span style={{ color: "var(--primary)" }}>■</span> kunjungan &nbsp; <span style={{ color: "var(--accent)" }}>●</span> klik</small></div>
      <svg className="chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Grafik kunjungan dan klik 30 hari">
        {series.map((d, i) => <rect key={d.date} x={i * bw + 2} width={bw - 4} y={h - (d.views / max) * (h - 10)} height={(d.views / max) * (h - 10)} rx={3} fill="var(--primary)" opacity={0.75}><title>{`${d.date}: ${d.views} kunjungan, ${d.clicks} klik`}</title></rect>)}
        <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth={3} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

/* ---------------------------- Langganan ---------------------------- */
interface PlanPub { id: string; name: string; priceMonthly: number; priceYearly: number; maxLinks: number; analyticsLevel: string; removeBranding: boolean; trialDays: number; isFree: boolean; allThemes: boolean }
interface SubData {
  user: { email: string; emailVerified: boolean; trialUsed: boolean }; plan: PlanPub; state: "free" | "active" | "grace" | "freemode";
  expiresAt: string | null; graceDays: number; freeMode: boolean; plans: PlanPub[];
  orders: { id: string; orderId: string; planName: string; period: string; amount: number; status: string; paymentType?: string; createdAt: string }[];
}
declare global { interface Window { snap?: { pay: (token: string, o: Record<string, () => void>) => void } } }

function loadSnap(src: string, key: string) {
  return new Promise<void>((res, rej) => {
    if (window.snap) return res();
    const s = document.createElement("script");
    s.src = src; s.setAttribute("data-client-key", key);
    s.onload = () => res();
    s.onerror = () => rej(new Error("Gagal memuat Midtrans"));
    document.head.appendChild(s);
  });
}

const STATE_LABEL = { free: "Gratis", active: "Aktif", grace: "Masa tenggang", freemode: "Promo: semua fitur dibuka sementara" };
const ORDER_BADGE: Record<string, string> = { settlement: "ok", pending: "", expire: "bad", cancel: "bad" };

function PlanTab({ flash }: { flash: Flash }) {
  const { data, reload } = useLoad<SubData>("/api/subscription");
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [busy, setBusy] = useState("");
  if (!data) return <p className="hint">Memuat…</p>;

  async function pay(p: PlanPub) {
    setBusy(p.id);
    try {
      const o = await api<{ token: string; orderId: string; clientKey: string; snapUrl: string }>("/api/orders", "POST", { planId: p.id, period });
      await loadSnap(o.snapUrl, o.clientKey);
      const done = async () => { try { await api("/api/orders/sync", "POST", { orderId: o.orderId }); } catch {} await reload(); };
      window.snap!.pay(o.token, { onSuccess: done, onPending: done, onError: () => { flash("Pembayaran gagal", true); done(); }, onClose: done });
    } catch (e) { flash((e as Error).message, true); }
    setBusy("");
  }
  async function trial(p: PlanPub) {
    try { await api("/api/trial", "POST", { planId: p.id }); flash(`Trial ${p.name} aktif`); await reload(); } catch (e) { flash((e as Error).message, true); }
  }
  async function sync(orderId: string) {
    try { await api("/api/orders/sync", "POST", { orderId }); await reload(); flash("Status diperbarui"); } catch (e) { flash((e as Error).message, true); }
  }

  const paid = data.plans.filter((p) => !p.isFree);
  return (
    <>
      <div className="card2">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div><b style={{ fontSize: "1.2rem" }}>Paket {data.plan.name}</b> <span className={`badge${data.state === "active" ? " ok" : ""}`}>{STATE_LABEL[data.state]}</span></div>
          <div>{data.expiresAt && data.plan && !data.plan.isFree ? <>Berlaku sampai <b>{fmtDate(data.expiresAt)}</b></> : null}</div>
        </div>
        {data.state === "grace" && <p className="hint">Paket sudah berakhir. Masa tenggang {data.graceDays} hari; setelah itu akun turun ke Free dan link berlebih dinonaktifkan (tidak dihapus).</p>}
      </div>

      <div className="row" style={{ margin: "16px 0 4px" }}>
        <b>Pilih paket</b>
        <div className="tabs" style={{ margin: 0, padding: 3 }}>
          <button type="button" aria-selected={period === "monthly"} onClick={() => setPeriod("monthly")}>Bulanan</button>
          <button type="button" aria-selected={period === "yearly"} onClick={() => setPeriod("yearly")}>Tahunan</button>
        </div>
      </div>
      <div className="plans">
        {paid.map((p) => {
          const price = period === "yearly" ? p.priceYearly : p.priceMonthly;
          return (
            <section key={p.id} className={`plan${data.plan.id === p.id ? " current" : ""}`}>
              <h2>{p.name}</h2>
              <p className="price">{idr(price)}<small> / {period === "yearly" ? "tahun" : "bulan"}</small></p>
              <ul className="feat">
                <li>Sampai {p.maxLinks} link aktif</li>
                <li>Analitik: {p.analyticsLevel === "full" ? "lengkap" : p.analyticsLevel === "basic" ? "7 & 30 hari" : "total klik"}</li>
                <li>{p.allThemes ? "Semua tema 3D premium" : "Tema dasar"}</li>
                {p.removeBranding && <li>Tanpa label Tautin</li>}
              </ul>
              <button disabled={busy === p.id || price <= 0} onClick={() => pay(p)}>{busy === p.id ? "Memproses…" : data.plan.id === p.id ? "Perpanjang" : "Bayar"}</button>
              {p.trialDays > 0 && !data.user.trialUsed && data.state !== "active" && <button type="button" className="sm ghost" style={{ marginTop: 10 }} onClick={() => trial(p)}>Coba gratis {p.trialDays} hari</button>}
            </section>
          );
        })}
      </div>
      <p className="hint">Prabayar lewat QRIS &amp; Virtual Account: tidak ada tagihan otomatis. Perpanjangan menambah masa aktif dari tanggal berakhir saat ini.</p>

      <h2 className="sec">Riwayat pembayaran</h2>
      {data.orders.length === 0 ? <p className="hint">Belum ada transaksi.</p> : (
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Tanggal</th><th>Paket</th><th>Periode</th><th>Jumlah</th><th>Status</th><th /></tr></thead>
          <tbody>{data.orders.map((o) => (
            <tr key={o.id}><td>{fmtDate(o.createdAt)}</td><td>{o.planName}</td><td>{o.period === "yearly" ? "Tahunan" : "Bulanan"}</td><td>{idr(o.amount)}</td>
              <td><span className={`badge ${ORDER_BADGE[o.status] ?? ""}`}>{o.status}</span></td>
              <td>{o.status === "pending" && <button className="sm ghost" onClick={() => sync(o.orderId)}>Cek status</button>}</td></tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  );
}

/* ------------------------------- Akun ------------------------------ */
function AccountTab({ flash }: { flash: Flash }) {
  const { data } = useLoad<SubData>("/api/subscription");
  const [busy, setBusy] = useState(false);

  async function changePw(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const v = Object.fromEntries(new FormData(form)) as Record<string, string>;
    setBusy(true);
    try {
      await api("/api/account/password", "POST", { current: v.current, next: v.next });
      form.reset(); // sukses: kosongkan kolom password
      flash("Password diganti");
    } catch (err) { flash((err as Error).message, true); }
    setBusy(false);
  }
  async function resend() {
    try { await api("/api/auth/resend-verification", "POST"); flash("Email verifikasi dikirim"); } catch (e) { flash((e as Error).message, true); }
  }

  if (!data) return <p className="hint">Memuat…</p>;
  return (
    <div className="grid2">
      <div className="card2">
        <b>Email</b>
        <p>{data.user.email} <span className={`badge ${data.user.emailVerified ? "ok" : "bad"}`}>{data.user.emailVerified ? "terverifikasi" : "belum terverifikasi"}</span></p>
        {!data.user.emailVerified && <button className="sm" onClick={resend}>Kirim ulang verifikasi</button>}
      </div>
      <form className="card2" onSubmit={changePw}>
        <b>Ganti password</b>
        <input name="current" type="password" placeholder="Password saat ini" autoComplete="current-password" required />
        <input name="next" type="password" placeholder="Password baru (min. 8 karakter)" autoComplete="new-password" required minLength={8} />
        <button disabled={busy}>Simpan password</button>
      </form>
    </div>
  );
}
