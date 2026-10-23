import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { effectivePlan } from "@/lib/plans";
import { ensureProfile, resolveTheme } from "@/lib/profile";
import PageViewBeacon from "../PageViewBeacon";
import type { LinkDoc, User } from "@/lib/types";
import "./profile.css";

// Halaman publik: SSR + cache. Dibuang otomatis saat pemilik mengubah profil/link/paket.
export const revalidate = 300;

const FONTS = {
  poppins: "var(--font-poppins), system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, 'SFMono-Regular', Menlo, monospace",
  system: "system-ui, -apple-system, 'Segoe UI', sans-serif",
};

async function load(username: string) {
  const db = await getDb();
  const user = await db.collection<User>("users").findOne({ username: username.toLowerCase(), status: "active" });
  if (!user) return null;
  const profile = await ensureProfile(user);
  const { plan } = await effectivePlan(user);
  const { config } = await resolveTheme(profile, plan);
  const links = await db.collection<LinkDoc>("links").find({ userId: user._id, isActive: true, disabledByPlan: { $ne: true } }).sort({ order: 1 }).toArray();
  return { user, profile, plan, config, links };
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const d = await load((await params).username);
  if (!d) return { title: "Tidak ditemukan · Tautin" };
  const title = `${d.profile.displayName} (@${d.user.username}) · Tautin`;
  return {
    title,
    description: d.profile.bio || `Semua tautan ${d.profile.displayName} di satu tempat.`,
    openGraph: { title, description: d.profile.bio || undefined, images: d.profile.avatarUrl ? [d.profile.avatarUrl] : undefined },
  };
}

export default async function PublicProfile({ params }: { params: Promise<{ username: string }> }) {
  const d = await load((await params).username);
  if (!d) notFound();
  const { user, profile, plan, config: c, links } = d;
  const style = {
    "--bg1": c.bg1, "--bg2": c.bg2, "--tx": c.text, "--bb": c.buttonBg, "--bt": c.buttonText,
    "--br": `${c.buttonRadius}px`, fontFamily: FONTS[c.font],
  } as CSSProperties;

  return (
    <div className={`pub pub-${c.bgType} pbtn-${c.buttonStyle}${c.tilt ? " tilt" : ""}`} style={style}>
      {c.bgType === "3d" && (
        <div className="pub-shapes" aria-hidden>
          <i /><i /><i /><i /><i />
        </div>
      )}
      <div className="pub-wrap" role="main">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="pub-avatar" src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" width={96} height={96} />
        ) : (
          <div className="pub-avatar pub-initial" aria-hidden>{profile.displayName.slice(0, 1).toUpperCase()}</div>
        )}
        <h1>{profile.displayName}</h1>
        <p className="pub-user">@{user.username}</p>
        {profile.bio && <p className="pub-bio">{profile.bio}</p>}

        <ul className="pub-links">
          {links.map((l) =>
            l.type === "header" ? (
              <li key={l._id.toString()} className="pub-heading">{l.title}</li>
            ) : (
              <li key={l._id.toString()}>
                <a className={`pl${l.type === "social" ? " pl-social" : ""}`} href={`/r/${l._id.toString()}`} rel="nofollow noopener">
                  {l.title}
                </a>
              </li>
            )
          )}
        </ul>
        {links.length === 0 && <p className="pub-bio">Belum ada tautan.</p>}

        <footer className="pub-foot">
          {!plan.removeBranding && <Link href="/">Dibuat dengan <b>Tautin</b></Link>}
          <Link href={`/report?u=${user.username}`}>Laporkan</Link>
        </footer>
      </div>
      <PageViewBeacon profileId={profile._id.toString()} />
    </div>
  );
}
