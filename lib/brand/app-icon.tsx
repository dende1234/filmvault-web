import { ImageResponse } from "next/og";

/** Renders the Filmory mark (same geometry as components/brand/logo.tsx)
 * on the dark cinema background, for app/icon.tsx, app/apple-icon.tsx and the
 * install icons (app/pwa-icon). `maskable`: full-bleed square with the mark
 * inside the safe zone, as Android crops it into its own shape. */
export function renderAppIcon(size: number, { maskable = false }: { maskable?: boolean } = {}) {
  const windows = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * Math.PI) / 3 - Math.PI / 2;
    return { cx: 16 + Math.cos(angle) * 7.5, cy: 16 + Math.sin(angle) * 7.5 };
  });
  const mark = Math.round(size * (maskable ? 0.5 : 0.66));
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
          borderRadius: maskable ? 0 : size * 0.22,
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
