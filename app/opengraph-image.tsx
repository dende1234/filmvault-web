import { ImageResponse } from "next/og";
import { getTrendingMovies } from "@/lib/tmdb/server";
import { posterUrl } from "@/types/tmdb";
import { OG_BG, OG_SIZE, OgMark, OgPosterFan } from "@/lib/brand/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Filmory: je dvd-, Blu-ray- en 4K-collectie bijhouden";
// Refresh the poster wall daily, not per request.
export const revalidate = 86400;

/** Default link preview for filmory.nl: the mark, the promise and a fan of
 * this week's popular posters. */
export default async function Image() {
  let posters: string[] = [];
  try {
    posters = (await getTrendingMovies("nl")).results
      .map((m) => posterUrl(m.poster_path, "w342"))
      .filter((u): u is string => !!u)
      .slice(0, 4);
  } catch {
    posters = [];
  }
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: OG_BG, color: "#f1ede4", padding: 64 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: posters.length ? 520 : "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <OgMark />
            <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>Filmory</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <span style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1.5 }}>Je filmcollectie altijd bij de hand</span>
            <span style={{ fontSize: 28, color: "#a29e96", lineHeight: 1.35 }}>
              Dvd, Blu-ray en 4K. Scan de barcode en zie meteen of je hem al hebt.
            </span>
          </div>
          <span style={{ fontSize: 26, color: "#e5a823" }}>filmory.nl · gratis</span>
        </div>
        {posters.length > 0 && (
          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
            <OgPosterFan urls={posters} />
          </div>
        )}
      </div>
    ),
    size,
  );
}
