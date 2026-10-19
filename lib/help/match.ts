/** Question → help entries, without AI: normalise, stem, map synonyms,
 * tolerate small typos, score against each entry's keywords and question.
 * Pure functions, so the rules are easy to test (see lib/help/faq.ts). */

export type Lang = "nl" | "en";

export type HelpEntry = {
  id: string;
  category: string;
  /** false = Filmory can't do this (yet): the answer says so and offers feedback. */
  possible: boolean;
  q: Record<Lang, string>;
  /** Short answer; [label](/path) makes an internal link. */
  a: Record<Lang, string>;
  keywords: Record<Lang, string[]>;
  /** Paths (prefix match) where this entry is suggested as "help on this page". */
  pages?: string[];
};

export type HelpMatch = { entry: HelpEntry; score: number };

const STOPWORDS = new Set(
  [
    // nl
    "hoe", "kan", "ik", "je", "jij", "u", "de", "het", "een", "en", "of", "in", "op", "aan", "van", "voor", "met", "naar",
    "is", "zijn", "wordt", "worden", "mijn", "mn", "m", "die", "dat", "dit", "deze", "er", "wat", "waar", "wanneer",
    "waarom", "welke", "wel", "niet", "geen", "ook", "nog", "al", "om", "te", "mag", "moet", "wil", "graag", "even",
    "doe", "doen", "zou", "kunnen", "hebben", "heb", "heeft", "via", "bij", "uit", "als", "dan", "maar", "toch", "zo",
    "iets", "alles", "mogelijk", "manier", "werkt", "werken", "filmory", "app", "website", "site",
    // en
    "how", "can", "i", "you", "the", "a", "an", "and", "or", "in", "on", "to", "of", "for", "with", "is", "are", "my",
    "do", "does", "what", "where", "when", "why", "which", "it", "this", "that", "there", "be", "not", "no", "also",
    "possible", "way", "works", "work", "want", "please", "would", "could", "should", "have", "has", "from", "at", "by",
    "me", "into", "any", "some",
    // too generic in a film app, or verbs that only say "do it"
    "film", "films", "movie", "movies", "titel", "titels", "title", "titles", "toe", "wie", "hoeveel", "kun", "kunt",
    "instellen", "aangeven", "aanzetten", "vastleggen", "maken", "maak", "aanmaken", "krijgen", "set", "get", "make",
    "who", "much", "many", "per",
  ].map((w) => w.normalize("NFD").replace(/[̀-ͯ]/g, "")),
);

/** Variants → one canonical token (applied after stemming). */
const SYNONYMS: Record<string, string> = {
  // several / other
  meerdere: "multi", meerder: "multi", twee: "multi", "2": "multi", verschillende: "multi", verschillend: "multi",
  several: "multi", multiple: "multi", andere: "other", ander: "other", other: "other", another: "other",
  // seeing (who can see / what have I watched)
  zien: "see", zie: "see", ziet: "see", bekijk: "see", bekijken: "see", see: "see", view: "see", viewing: "see",
  // add
  voeg: "add", voegen: "add", toevoeg: "add", toevoegen: "add", toegevoegd: "add", bijzet: "add", bijzetten: "add", invoer: "add", invoeren: "add",
  zet: "add", zetten: "add", plaats: "add", plaatsen: "add", add: "add", adding: "add", added: "add", insert: "add",
  // delete
  verwijder: "delete", verwijderen: "delete", weghal: "delete", weghalen: "delete", wis: "delete", wissen: "delete",
  delet: "delete", delete: "delete", remov: "delete", remove: "delete",
  // scan / barcode
  scan: "scan", scann: "scan", scannen: "scan", gescand: "scan", barcode: "barcode", streepjescod: "barcode",
  streepjescode: "barcode", ean: "barcode", upc: "barcode", code: "barcode",
  // formats
  dvd: "format", blu: "format", bluray: "format", ray: "format", uhd: "format", "4k": "format", formaat: "format",
  format: "format", vhs: "format",
  // box
  box: "box", boxset: "box", verzamelbox: "box", trilogie: "box", trilogy: "box", collectiebox: "box",
  // collection
  collecti: "collection", collectie: "collection", collection: "collection", verzamel: "collection", verzameling: "collection",
  kast: "collection", lijst: "list", list: "list",
  // wishlist
  verlanglijst: "wishlist", verlanglijstj: "wishlist", wishlist: "wishlist", wenslijst: "wishlist", wil: "wishlist",
  watchlist: "watchlist",
  // series
  seri: "series", serie: "series", series: "series", show: "series", tv: "series", seizoen: "season", season: "season",
  // watched
  bekek: "watched", bekeken: "watched", gezien: "watched", gekek: "watched", gekeken: "watched", watch: "watched",
  watched: "watched", seen: "watched", kijk: "watched", kijken: "watched",
  // share
  del: "share", delen: "share", gedeeld: "share", share: "share", sharing: "share", link: "share",
  // import / export
  import: "import", importer: "import", importeren: "import", inles: "import", inlezen: "import", spreadsheet: "csv",
  excel: "csv", csv: "csv", sheet: "csv", export: "export", exporter: "export", exporteren: "export", download: "export",
  backup: "export",
  // cover
  cover: "cover", hoes: "cover", hoesje: "cover", foto: "cover", photo: "cover", afbeelding: "cover", plaatje: "cover",
  poster: "cover",
  // money
  prijs: "price", kost: "price", kosten: "price", betal: "price", betalen: "price", gratis: "price", free: "price",
  price: "price", cost: "price", abonnement: "price", subscription: "price", premium: "price",
  waard: "value", waarde: "value", value: "value", worth: "value",
  // lending
  uitlen: "lend", lent: "lend", uitlenen: "lend", uitgeleend: "lend", leen: "lend", lenen: "lend", lend: "lend", loan: "lend",
  // misc
  vriend: "friend", vrienden: "friend", friend: "friend", volg: "follow", volgen: "follow", follow: "follow",
  account: "account", profiel: "account", profile: "account",
  taal: "language", language: "language", engels: "language", nederlands: "language", english: "language", dutch: "language",
  thema: "theme", modus: "mode", mode: "mode", donker: "theme", licht: "theme", dark: "theme", light: "theme", theme: "theme",
  regio: "region", region: "region", regiocod: "region", regiocode: "region", zone: "region",
  editie: "edition", editi: "edition", edition: "edition", steelbook: "edition", uitgav: "edition", uitgave: "edition", release: "edition",
  cut: "cut", versie: "cut", version: "cut", extended: "cut", theatrical: "cut",
  ondertitel: "subtitle", ondertitels: "subtitle", subtitle: "subtitle", subs: "subtitle",
  letterboxd: "letterboxd", meld: "notification", melding: "notification", notification: "notification",
  nieuwsbrief: "newsletter", newsletter: "newsletter", mail: "email", email: "email",
  feedback: "feedback", bug: "feedback", fout: "feedback", probleem: "feedback", idee: "feedback", idea: "feedback",
  game: "game", games: "game", spel: "game", spellen: "game", android: "android", iphone: "ios", ios: "ios",
  telefoon: "phone", phone: "phone", mobiel: "phone",
};

function stem(word: string): string {
  for (const suffix of ["ingen", "ing", "tjes", "tje", "jes", "je", "en", "es", "s", "e"]) {
    if (word.length > suffix.length + 3 && word.endsWith(suffix)) return word.slice(0, -suffix.length);
  }
  return word;
}

const FUZZY_KEYS = Object.keys(SYNONYMS).filter((k) => k.length >= 5);

function canonical(word: string): string | null {
  if (STOPWORDS.has(word)) return null;
  const stemmed = stem(word);
  const known = SYNONYMS[word] ?? SYNONYMS[stemmed];
  if (known) return known;
  if (STOPWORDS.has(stemmed)) return null;
  // One typo in a known word ("colectie") still finds it.
  if (word.length >= 5) {
    const near = FUZZY_KEYS.find((k) => oneEdit(word, k));
    if (near) return SYNONYMS[near];
  }
  return stemmed;
}

/** Text → canonical tokens (stopwords out, stemmed, synonyms mapped). */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/blu[\s-]?ray/g, "bluray")
    .replace(/back[\s-]?up/g, "backup")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map(canonical)
    .filter((w): w is string => w !== null);
}

/** Levenshtein distance ≤ 1 (one typo), cheap check. */
function oneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

type Indexed = { entry: HelpEntry; keywords: Set<string>; phrases: string[][]; question: Set<string> };
type Index = { items: Indexed[]; df: Map<string, number> };
const cache = new WeakMap<HelpEntry[], Index>();

function index(entries: HelpEntry[]): Index {
  const hit = cache.get(entries);
  if (hit) return hit;
  const built = entries.map((entry) => {
    const kw = [...entry.keywords.nl, ...entry.keywords.en];
    const phrases = kw.map(tokenize).filter((p) => p.length > 0);
    return {
      entry,
      keywords: new Set(phrases.flat()),
      phrases: phrases.filter((p) => p.length > 1),
      question: new Set([...tokenize(entry.q.nl), ...tokenize(entry.q.en)]),
    };
  });
  // In how many entries a keyword occurs: rare words decide the ranking.
  const df = new Map<string, number>();
  for (const it of built) for (const k of it.keywords) df.set(k, (df.get(k) ?? 0) + 1);
  const idx = { items: built, df };
  cache.set(entries, idx);
  return idx;
}

/** Minimum score for an answer; below it the question counts as unanswered.
 * One exact keyword hit (3) among a bit of noise passes; a lone typo or a
 * word that only occurs in the question text does not. */
export const ANSWER_THRESHOLD = 2.5;

const onPage = (entry: HelpEntry, page: string) =>
  entry.pages?.some((p) => page === p || page.startsWith(p.endsWith("/") ? p : `${p}/`)) ?? false;

/** Best entries for a question, best first (only those above the threshold).
 * The threshold uses the plain score ("is this relevant at all?"); the
 * ranking weighs rare keywords heavier ("which entry is it about?"). */
export function matchHelp(question: string, entries: HelpEntry[], page?: string, limit = 3): HelpMatch[] {
  const tokens = Array.from(new Set(tokenize(question)));
  if (tokens.length === 0) return [];
  const { items, df } = index(entries);
  const scored = items.map(({ entry, keywords, phrases, question: q }) => {
    let score = 0;
    let rank = 0;
    let hits = 0;
    let qHits = 0;
    for (const tok of tokens) {
      if (q.has(tok)) qHits++;
      if (keywords.has(tok)) {
        score += 3;
        rank += 3 * Math.min(1, Math.sqrt(2 / (df.get(tok) ?? 1)));
        hits++;
      } else if (tok.length >= 5 && Array.from(keywords).some((k) => k.length >= 5 && oneEdit(tok, k))) {
        score += 2;
        rank += 2;
        hits++;
      } else if (q.has(tok)) {
        score += 1.5;
        rank += 1.5;
        hits++;
      }
    }
    // A multi-word keyword fully present ("meerdere collecties") is a strong signal.
    for (const p of phrases) {
      if (p.every((t) => tokens.includes(t))) {
        score += 2;
        rank += 2;
      }
    }
    // Unrelated words dilute the match a little.
    const dilution = 0.75 + 0.25 * (hits / tokens.length);
    score *= dilution;
    rank *= dilution;
    // Tie-break: how much of the entry's own question was asked.
    if (q.size > 0) rank += qHits / q.size;
    if (page && onPage(entry, page)) rank += 0.75;
    return { entry, score, rank };
  });
  return scored
    .filter((m) => m.score >= ANSWER_THRESHOLD)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit)
    .map(({ entry, score }) => ({ entry, score }));
}

/** Entries suggested for the current page. */
export function entriesForPage(entries: HelpEntry[], page: string, limit = 4): HelpEntry[] {
  return entries.filter((e) => onPage(e, page)).slice(0, limit);
}
