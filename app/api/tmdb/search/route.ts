import { NextResponse, type NextRequest } from "next/server";
import { searchMovies, searchTv } from "@/lib/tmdb/server";

/** The one client-driven TMDB endpoint (search-as-you-type in movie pickers) —
 * everything else is called server-side directly from Server Components. */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim();
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const language = request.nextUrl.searchParams.get("language") ?? "nl";
  // ?type=tv searches series; results come back film-shaped with negative
  // ids (see lib/titles.ts).
  const type = request.nextUrl.searchParams.get("type") === "tv" ? "tv" : "movie";

  if (!query) {
    return NextResponse.json({ page: 1, results: [], total_pages: 1, total_results: 0 });
  }

  try {
    const data = type === "tv" ? await searchTv(query, page, language) : await searchMovies(query, page, language);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "TMDB search failed" }, { status: 502 });
  }
}
