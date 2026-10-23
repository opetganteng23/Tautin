"use client";
import { useEffect, useState } from "react";

const THEMES = [
  { id: "ailo", label: "AILO", a: "#00809d", b: "#f47421" },
  { id: "sunset", label: "Sunset", a: "#d6336c", b: "#f59f00" },
  { id: "mint", label: "Mint", a: "#0b8f6a", b: "#7c4dff" },
  { id: "midnight", label: "Midnight", a: "#0b1330", b: "#4cc9f0" },
];

function read(key: string, fallback: string) {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}

export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState("ailo");
  const [fx, setFx] = useState(true);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme || read("tautin-theme", "ailo"));
    setFx((document.documentElement.dataset.fx || read("tautin-fx", "on")) !== "off");
  }, []);

  function pick(id: string) {
    setTheme(id);
    document.documentElement.dataset.theme = id;
    try { localStorage.setItem("tautin-theme", id); } catch {}
  }
  function toggleFx(on: boolean) {
    setFx(on);
    document.documentElement.dataset.fx = on ? "on" : "off";
    try { localStorage.setItem("tautin-fx", on ? "on" : "off"); } catch {}
  }

  return (
    <div className="themer">
      {open && (
        <div className="themer-panel" role="dialog" aria-label="Pengaturan tampilan">
          <h2>Tema</h2>
          <div className="swatches">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                className="swatch"
                title={t.label}
                aria-label={t.label}
                aria-pressed={theme === t.id}
                style={{ ["--a" as string]: t.a, ["--b" as string]: t.b }}
                onClick={() => pick(t.id)}
              />
            ))}
          </div>
          <label className="fx-row">
            Efek 3D &amp; animasi
            <input type="checkbox" checked={fx} onChange={(e) => toggleFx(e.target.checked)} />
          </label>
        </div>
      )}
      <button type="button" className="themer-toggle" aria-label="Ubah tampilan" onClick={() => setOpen((o) => !o)}>
        🎨
      </button>
    </div>
  );
}
