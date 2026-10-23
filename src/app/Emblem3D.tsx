"use client";
import { useEffect, useRef } from "react";

const LAYERS = 22;
const GAP = 0.0125;

/** Logo AILO sebagai tumpukan irisan tipis di sumbu Z; miring mengikuti pointer. */
export default function Emblem3D() {
  const tiltRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = tiltRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX / window.innerWidth - 0.5;
      const dy = e.clientY / window.innerHeight - 0.5;
      el.style.transform = `rotateY(${dx * 24}deg) rotateX(${-dy * 18}deg)`;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div aria-hidden className="emblem">
      <div className="emblem-bob">
        <div ref={tiltRef} className="emblem-tilt">
          <div className="emblem-sway" style={{ position: "relative" }}>
            {Array.from({ length: LAYERS }, (_, i) => (
              <div
                key={i}
                className="emblem-slice"
                style={{
                  transform: `translateZ(calc(var(--emblem) * ${((i - (LAYERS - 1) / 2) * GAP).toFixed(4)}))`,
                  filter: `hue-rotate(var(--emblem-hue)) brightness(${0.5 + (0.5 * i) / (LAYERS - 1)})`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="emblem-shadow" />
    </div>
  );
}
