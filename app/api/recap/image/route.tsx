import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { getUserCollections, getCollectionItemsForCollections } from "@/actions/collections";
import { getEarnedBadges } from "@/actions/badges";
import { getLocale } from "@/lib/preferences";
import { computeRecap } from "@/lib/recap";
import { posterUrl } from "@/types/tmdb";
import { OG_BG, OgMark, OgPosterFan } from "@/lib/brand/og";

// "Filmory Wrapped": the signed-in member's yearly recap as a story-sized
// image (1080x1920) to share on Instagram/WhatsApp. Only their own data.
export const dynamic = "force-dynamic";

const T = {
  nl: {
    kicker: "Mijn filmjaar",
    added: (n: number) => (n === 1 ? "film erbij" : "films erbij"),
    watched: "al gekeken",
    rating: "gemiddeld cijfer",
    format: "meest gekocht",
    month: "drukste maand",
    total: (n: number) => `${n} films in de kast`,
    footer: "Houd je eigen collectie bij op filmory.nl",
    locale: "nl-NL",
  },
  en: {
    kicker: "My year in film",
    added: (n: number) => (n === 1 ? "film added" : "films added"),
    watched: "watched",
    rating: "average rating",
    format: "most bought",
    month: "busiest month",
    total: (n: number) => `${n} films on the shelf`,
    footer: "Track your own collection at filmory.nl",
    locale: "en-GB",
  },
};

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const url = new URL(request.url);
  const thisYear = new Date().getFullYear();
  const year = Number(url.searchParams.get("year")) || thisYear;
  if (year < 2000 || year > thisYear) return new Response("bad year", { status: 400 });
  const t = T[(await getLocale()) === "en" ? "en" : "nl"];

  const collections = await getUserCollections();
  const raw = await getCollectionItemsForCollections(collections.map((c) => c.id));
  const seen = new Set<string>();
  const items = raw.filter((i) => (seen.has(i.item_group_id) ? false : (seen.add(i.item_group_id), true)));
  const badges = await getEarnedBadges();
  const r = computeRecap(items, collections, badges, year);

  const covers = r.highlights
    .slice(0, 5)
    .map((p) => posterUrl(p, "w342"))
    .filter((u): u is string => !!u);
  const month = r.busiestMonth ? new Date(2000, r.busiestMonth - 1, 1).toLocaleDateString(t.locale, { month: "long" }) : "–";
  const stats: [string, string][] = [
    [`${r.alreadyWatched}`, t.watched],
    [r.averageRating != null ? r.averageRating.toFixed(1) : "–", t.rating],
    [r.topType ?? "–", t.format],
    [month, t.month],
  ];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: OG_BG, color: "#f1ede4", padding: 80 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <OgMark size={60} />
          <span style={{ fontSize: 46, fontWeight: 700, letterSpacing: -1 }}>Filmory</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 90 }}>
          <span style={{ fontSize: 40, color: "#e5a823", textTransform: "uppercase", letterSpacing: 6 }}>{t.kicker}</span>
          <span style={{ fontSize: 220, fontWeight: 700, lineHeight: 1, letterSpacing: -8 }}>{year}</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginTop: 40 }}>
          <span style={{ fontSize: 170, fontWeight: 700, lineHeight: 1, color: "#e5a823" }}>{r.filmsAdded}</span>
          <span style={{ fontSize: 54 }}>{t.added(r.filmsAdded)}</span>
        </div>
        {covers.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 50 }}>
            <OgPosterFan urls={covers} height={420} />
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", marginTop: covers.length ? 40 : 90, rowGap: 36 }}>
          {stats.map(([value, label]) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", width: "50%" }}>
              <span style={{ fontSize: 64, fontWeight: 700, textTransform: "capitalize" }}>{value}</span>
              <span style={{ fontSize: 34, color: "#a29e96" }}>{label}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", gap: 10 }}>
          <span style={{ fontSize: 38 }}>{t.total(r.totalOwned)}</span>
          <span style={{ fontSize: 32, color: "#a29e96" }}>{t.footer}</span>
        </div>
      </div>
    ),
    { width: 1080, height: 1920, headers: { "Cache-Control": "private, no-store" } },
  );
}
