import { NextResponse, type NextRequest } from "next/server";
import { searchMovies } from "@/lib/tmdb/server";

/** The one client-driven TMDB endpoint (search-as-you-type in movie pickers) —
 * everything else is called server-side directly from Server Components. */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim();
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const language = request.nextUrl.searchParams.get("language") ?? "nl";

  if (!query) {
    return NextResponse.json({ page: 1, results: [], total_pages: 1, total_results: 0 });
  }

  try {
    const data = await searchMovies(query, page, language);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "TMDB search failed" }, { status: 502 });
  }
}
