/** Shelf order for titles, like a store or a collector's app: leading
 * articles don't count ("The Bank Job" and "De Bad Guys" file under B),
 * accents are ignored and numbers sort naturally. */
const ARTICLES = /^(the|a|an|de|het|een|le|la|les|l'|die|der|das|el|los|las|il)\s+/i;

export function sortTitle(title: string): string {
  return title
    .trim()
    .replace(/^l'/i, "")
    .replace(ARTICLES, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .toLowerCase();
}

export function compareTitles(a: string, b: string): number {
  return sortTitle(a).localeCompare(sortTitle(b), "nl", { numeric: true, sensitivity: "base" }) || a.localeCompare(b);
}

/** The shelf letter: A–Z, or "#" for titles starting with a digit or symbol. */
export function shelfLetter(title: string): string {
  const c = sortTitle(title).charAt(0).toUpperCase();
  return c >= "A" && c <= "Z" ? c : "#";
}
