import type { ReactNode } from "react";
import Link from "next/link";
import Sky from "./Sky";
import ThemeSwitcher from "./ThemeSwitcher";
import LogoutButton from "./LogoutButton";

/** Kerangka dashboard/admin: bilah atas ringkas + konten lebar. */
export default function AppFrame({ children, badge }: { children: ReactNode; badge?: string }) {
  return (
    <>
      <Sky />
      <div className="app">
        <header className="topbar">
          <Link href="/" className="brand-sm">
            <span style={{ color: "var(--primary)" }}>tautin</span>
            <span style={{ color: "var(--accent)" }}>.ailo</span>
            <span style={{ color: "var(--dark-title)" }}>.id</span>
            {badge && <em>{badge}</em>}
          </Link>
          <LogoutButton />
        </header>
        {children}
      </div>
      <ThemeSwitcher />
    </>
  );
}
