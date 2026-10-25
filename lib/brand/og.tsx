import { ImageResponse } from "next/og";

/** Shared bits for the Open Graph images (link previews in WhatsApp,
 * Facebook, Reddit): the cinema background, the Filmory mark, a poster fan. */
export const OG_SIZE = { width: 1200, height: 630 };

export const OG_BG = "radial-gradient(ellipse 80% 60% at 30% 0%, #3a2a0e 0%, #0b0b0d 60%)";

export function OgMark({ size = 44 }: { size?: number }) {
  const windows = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * Math.PI) / 3 - Math.PI / 2;
    return { cx: 16 + Math.cos(angle) * 7.5, cy: 16 + Math.sin(angle) * 7.5 };
  });
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="14" fill="none" stroke="#e5a823" strokeWidth="2.5" />
      {windows.map((w, i) => (
        <circle key={i} cx={w.cx} cy={w.cy} r="2.6" fill="#e5a823" />
      ))}
      <circle cx="16" cy="16" r="2.2" fill="none" stroke="#e5a823" strokeWidth="1.6" />
    </svg>
  );
}

/** A fanned row of posters (absolute URLs), front one in the middle. */
export function OgPosterFan({ urls, height = 320 }: { urls: string[]; height?: number }) {
  const width = Math.round(height * (2 / 3));
  const n = urls.length;
  return (
    <div style={{ display: "flex", position: "relative", width: width + (n - 1) * (width * 0.45), height: height + 40 }}>
      {urls.map((src, i) => {
        const offset = i - (n - 1) / 2;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt=""
            width={width}
            height={height}
            style={{
              position: "absolute",
              left: i * width * 0.45,
              top: 20 + Math.abs(offset) * 14,
              borderRadius: 14,
              objectFit: "cover",
              transform: `rotate(${offset * 4}deg)`,
              boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
              border: "2px solid rgba(255,255,255,0.08)",
            }}
          />
        );
      })}
    </div>
  );
}

/** The link preview of a public collection (app/c/[id]/opengraph-image.tsx). */
export function collectionOgImage({ name, owner, count, covers }: { name: string; owner: string | null; count: number; covers: string[] }) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: OG_BG, color: "#f1ede4", padding: 64 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: covers.length ? 520 : "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <OgMark />
            <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>Filmory</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <span style={{ fontSize: name.length > 28 ? 50 : 62, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1.5 }}>{name}</span>
            <span style={{ fontSize: 28, color: "#e5a823" }}>
              {count === 1 ? "1 film" : `${count} films`}
              {owner ? ` · ${owner}` : ""}
            </span>
          </div>
          <span style={{ fontSize: 24, color: "#a29e96" }}>Houd je eigen collectie bij op filmory.nl</span>
        </div>
        {covers.length > 0 && (
          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
            <OgPosterFan urls={covers.slice(0, 4)} />
          </div>
        )}
      </div>
    ),
    OG_SIZE,
  );
}
