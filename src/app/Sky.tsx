const CLOUDS = [
  { top: "6%", width: 260, duration: 90, delay: -20, opacity: 0.95 },
  { top: "22%", width: 170, duration: 70, delay: -55, opacity: 0.8 },
  { top: "48%", width: 300, duration: 110, delay: -70, opacity: 0.9 },
  { top: "68%", width: 200, duration: 80, delay: -10, opacity: 0.75 },
  { top: "84%", width: 340, duration: 120, delay: -95, opacity: 0.95 },
];

export default function Sky() {
  return (
    <div aria-hidden className="sky">
      {CLOUDS.map((c, i) => (
        <svg
          key={i}
          viewBox="0 0 200 80"
          width={c.width}
          className="cloud"
          style={{ top: c.top, opacity: c.opacity, animationDuration: `${c.duration}s`, animationDelay: `${c.delay}s` }}
        >
          <circle cx="50" cy="48" r="28" />
          <circle cx="92" cy="34" r="34" />
          <circle cx="137" cy="46" r="28" />
          <circle cx="167" cy="53" r="20" />
          <rect x="38" y="48" width="140" height="25" rx="12" />
        </svg>
      ))}
    </div>
  );
}
