import type { ReactNode } from "react";
import Emblem3D from "./Emblem3D";
import Sky from "./Sky";
import ThemeSwitcher from "./ThemeSwitcher";

/** Kerangka halaman: logo 3D + judul merek, lalu konten (kartu). */
export default function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <Sky />
      <div className="stage">
      <Emblem3D />
      <div className="brand">
        <span className="title-3d" style={{ ["--c" as string]: "var(--primary)", color: "var(--primary)" }}>tautin</span>
        <span className="title-3d" style={{ ["--c" as string]: "var(--accent)", color: "var(--accent)" }}>.ailo</span>
        <span className="title-3d" style={{ ["--c" as string]: "var(--dark-title)", color: "var(--dark-title)" }}>.id</span>
      </div>
      <p className="tagline">Satu link untuk semua tautanmu</p>
      {children}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-horizontal.png" alt="AILO, Telkom University's Center of Excellence" className="footer-logo" width={180} height={57} />
    </div>
      <ThemeSwitcher />
    </>
  );
}
