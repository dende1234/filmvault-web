import { XMLParser } from "fast-xml-parser";

/** Exports from other collection apps (DVD Profiler, CLZ Movies, My Movies,
 * and similar XML) → a table with Dutch column names that the CSV import
 * already recognises. Tolerant: finds the repeated record element itself
 * and looks for each field under the names these apps use. Pure. */

type Leafs = Map<string, string>;

const HEADER = ["Titel", "Jaar", "Barcode", "Formaat", "Editie", "Bekeken", "Rating", "Aankoopprijs", "Aankoopdatum", "Winkel", "Plek", "Soort"];

// Paths are lowercase, "/"-joined, relative to the record; first hit wins.
const FIELDS: Record<string, string[]> = {
  Titel: ["title", "localtitle", "name", "movietitle", "titlesort", "originaltitle", "sorttitle"],
  Jaar: ["productionyear", "year", "releaseyear", "releasedate/year/displayname", "releasedate/year", "released", "releasedate"],
  Barcode: ["upc", "ean", "barcode", "gtin"],
  Formaat: ["format/displayname", "format", "mediatype", "type", "media", "discformat"],
  Editie: ["edition/displayname", "edition", "version", "distributiontrait"],
  Bekeken: ["seenit", "seen", "watched", "viewed"],
  Rating: ["myrating", "personalrating", "userrating", "rating/personal", "rating"],
  Aankoopprijs: ["purchaseinfo/price", "purchaseprice", "price", "pricepaid"],
  Aankoopdatum: ["purchaseinfo/date", "purchasedate/date", "purchasedate", "dateadded"],
  Winkel: ["purchaseinfo/place", "store/displayname", "store", "purchasestore", "vendor"],
  Plek: ["location/displayname", "location", "storagedevice/displayname", "storagelocation", "shelf"],
  Soort: ["kind", "mediatype/displayname"],
};

const truthy = (v: string | undefined) => !!v && /^(true|yes|ja|1|y)$/i.test(v.trim());

function flatten(node: unknown, prefix: string, out: Leafs) {
  if (node === null || node === undefined) return;
  if (typeof node !== "object") {
    const key = prefix.toLowerCase();
    if (!out.has(key)) out.set(key, String(node).trim());
    return;
  }
  if (Array.isArray(node)) {
    // Repeated child (e.g. several formats): first one counts.
    flatten(node[0], prefix, out);
    return;
  }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k === "#text") flatten(v, prefix, out);
    else flatten(v, prefix ? `${prefix}/${k}` : k, out);
  }
}

/** DVD Profiler: <MediaTypes><DVD>true</DVD><BluRay>false</BluRay><UltraHD>…</MediaTypes>. */
function formatFromFlags(leafs: Leafs): string | null {
  const uhd = truthy(leafs.get("mediatypes/ultrahd"));
  const bd = truthy(leafs.get("mediatypes/bluray"));
  const dvd = truthy(leafs.get("mediatypes/dvd"));
  if (uhd && bd) return "4K Ultra HD + Blu-ray";
  if (uhd) return "4K Ultra HD";
  if (bd && dvd) return "Blu-ray + DVD";
  if (bd) return "Blu-ray";
  if (dvd) return "DVD";
  return null;
}

/** The largest list of objects in the document = the records. */
function findRecords(node: unknown): Record<string, unknown>[] {
  let best: Record<string, unknown>[] = [];
  const visit = (n: unknown) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) {
      const objects = n.filter((x) => x && typeof x === "object" && !Array.isArray(x)) as Record<string, unknown>[];
      if (objects.length > best.length) best = objects;
      n.forEach(visit);
      return;
    }
    const values = Object.values(n as Record<string, unknown>);
    // A single record wrapped in its parent (only one film in the file).
    for (const v of values) visit(v);
  };
  visit(node);
  if (best.length === 0 && node && typeof node === "object") {
    // One record: the deepest object that has a title-like child.
    const stack: unknown[] = [node];
    while (stack.length) {
      const n = stack.pop() as Record<string, unknown>;
      if (n && typeof n === "object" && !Array.isArray(n)) {
        // The record holds a title-like field as plain text (not a nested element).
        if (Object.entries(n).some(([k, v]) => /^(title|localtitle|name)$/i.test(k) && typeof v !== "object")) return [n];
        stack.push(...Object.values(n));
      }
    }
  }
  return best;
}

export function looksLikeXml(text: string): boolean {
  return /^\s*(<\?xml|<[A-Za-z])/.test(text);
}

export function xmlToTable(xml: string): string[][] {
  const parser = new XMLParser({ ignoreAttributes: true, parseTagValue: false, trimValues: true, processEntities: true });
  const doc = parser.parse(xml);
  const records = findRecords(doc);
  const rows: string[][] = [];
  for (const record of records) {
    const leafs: Leafs = new Map();
    flatten(record, "", leafs);
    const row = HEADER.map((col) => {
      for (const path of FIELDS[col]) {
        const v = leafs.get(path);
        if (v) return v;
      }
      return "";
    });
    const flagFormat = formatFromFlags(leafs);
    if (flagFormat) row[HEADER.indexOf("Formaat")] = flagFormat;
    // Normalise yes/no to what the CSV import reads.
    const seen = HEADER.indexOf("Bekeken");
    if (row[seen]) row[seen] = truthy(row[seen]) ? "ja" : "nee";
    if (row[HEADER.indexOf("Titel")]) rows.push(row);
  }
  return rows.length ? [HEADER, ...rows] : [];
}
