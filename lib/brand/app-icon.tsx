import { ImageResponse } from "next/og";

/** Renders the FilmVault mark (same geometry as components/brand/logo.tsx)
 * on the dark cinema background, for app/icon.tsx and app/apple-icon.tsx. */
export function renderAppIcon(size: number) {
  const windows = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * Math.PI) / 3 - Math.PI / 2;
    return { cx: 16 + Math.cos(angle) * 7.5, cy: 16 + Math.sin(angle) * 7.5 };
  });
  const mark = Math.round(size * 0.66);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0b0d",
          borderRadius: size * 0.22,
        }}
      >
        <svg width={mark} height={mark} viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="14" fill="none" stroke="#e5a823" strokeWidth="2.5" />
          {windows.map((w, i) => (
            <circle key={i} cx={w.cx} cy={w.cy} r="2.6" fill="#e5a823" />
          ))}
          <circle cx="16" cy="16" r="2.2" fill="none" stroke="#e5a823" strokeWidth="1.6" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
