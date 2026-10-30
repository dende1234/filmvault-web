"use server";

// Suggestions for a barcode Filmory doesn't know yet: the product title from
// an external barcode database (lib/barcode-lookup.ts), cleaned and searched
// on TMDB. The user picks the film; the barcode then goes through approval
// as usual, so nothing enters the shared list unchecked.

import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/preferences";
import { lookupProductTitle } from "@/lib/barcode-lookup";
import { cleanProductTitle } from "@/lib/product-title";
import { searchMovies, searchTv } from "@/lib/tmdb/server";
import { normalizeBarcode } from "@/lib/barcode";
import { withinLimit } from "@/lib/rate-limit";

export type BarcodeSuggestion = { id: number; title: string; poster: string | null; year: string | null };

export async function suggestTitlesForBarcode(raw: string): Promise<{ productTitle: string | null; suggestions: BarcodeSuggestion[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { productTitle: null, suggestions: [] };
  if (!(await withinLimit("barcode_suggest"))) return { productTitle: null, suggestions: [] };

  const productTitle = await lookupProductTitle(normalizeBarcode(raw));
  if (!productTitle) return { productTitle: null, suggestions: [] };
  const cleaned = cleanProductTitle(productTitle);
  const query = cleaned.length >= 2 ? cleaned : productTitle.replace(/[([{].*$/, "").trim();
  if (!query) return { productTitle, suggestions: [] };

  const locale = await getLocale();
  try {
    let page = await searchMovies(query, 1, locale);
    // A series box usually says "Season" / "Seizoen": try TV when films find nothing.
    if (page.results.length === 0 || /season|seizoen|series|complete/i.test(productTitle)) {
      const tv = await searchTv(query.replace(/\b(the )?complete\b|\bseason.*$|\bseries\b/gi, "").trim() || query, 1, locale);
      if (tv.results.length > 0 && (page.results.length === 0 || /season|seizoen/i.test(productTitle))) page = tv;
    }
    const suggestions = page.results.slice(0, 3).map((m) => ({
      id: m.id,
      title: m.title,
      poster: m.poster_path,
      year: m.release_date?.slice(0, 4) || null,
    }));
    return { productTitle, suggestions };
  } catch {
    return { productTitle, suggestions: [] };
  }
}
