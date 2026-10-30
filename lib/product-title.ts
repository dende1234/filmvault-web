/** A shop's product title → the film title to search TMDB with:
 * "The Shawshank Redemption (uk Import) Blu-ray" → "The Shawshank Redemption",
 * "Diary Of A Wimpy Kid [blu-ray] By Zachary Gordon" → "Diary Of A Wimpy Kid". */
export function cleanProductTitle(raw: string): string {
  return raw
    .replace(/\s+by\s+.*$/i, "") // "… By Actor, Actor."
    .replace(/[([{][^)\]}]*[)\]}]/g, " ") // (uk Import), [blu-ray], {…}
    .replace(
      /\b(4k|ultra\s*hd|uhd|blu[\s-]?ray|bluray|dvd|hd[\s-]?dvd|vhs|digital( hd| copy| code)?|steelbook|widescreen|full\s*screen|special edition|collector'?s edition|limited edition|anniversary edition|edition|2-disc|two-disc|\d+\s*-?\s*disc|region \w+|bilingual|import|uk|us|nl)\b/gi,
      " ",
    )
    .replace(/[-–:,/+|]+\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/[\s\-–:,.]+$/, "");
}
