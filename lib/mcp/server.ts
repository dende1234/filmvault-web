import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { cleanImportBarcode } from "@/lib/import-mapping";
import {
  collectionStats,
  filterCopies,
  ownershipVerdict,
  summarizeCopies,
  type CopySummary,
  type McpCopy,
} from "@/lib/mcp/collection";

const COPY_COLUMNS =
  "item_group_id, collection_id, tmdb_movie_id, movie_title, barcode, type, editie, watched, rating, loaned_to, loaned_at, shelf_location, purchase_price, is_box, box_name, seasons";
const MAX_RESULTS = 100;

/** Everything is read for ONE member: the service-role client bypasses RLS,
 * so every query here filters on that member's own collections or user_id.
 * Read-only on purpose (fase 1). */
async function loadCollection(db: SupabaseClient, userId: string) {
  const { data: cols, error } = await db.from("collections").select("id, name").eq("user_id", userId).order("id");
  if (error) throw error;
  const names = new Map(((cols ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name]));
  const ids = [...names.keys()];
  const rows = ids.length
    ? await fetchAll<McpCopy>((from, to) =>
        db.from("collection_items").select(COPY_COLUMNS).in("collection_id", ids).order("id").range(from, to),
      ).catch(async () =>
        // Before purchase_details.sql / shelf_location.sql: without those columns.
        fetchAll<McpCopy>((from, to) =>
          db
            .from("collection_items")
            .select("item_group_id, collection_id, tmdb_movie_id, movie_title, barcode, type, editie, watched, rating, loaned_to, loaned_at, is_box, box_name")
            .in("collection_id", ids)
            .order("id")
            .range(from, to),
        ),
      )
    : [];
  return { rows, copies: summarizeCopies(rows, names), collections: names };
}

async function loadWishlist(db: SupabaseClient, userId: string) {
  return fetchAll<{ movie_title: string; is_grail?: boolean | null; added_at: string | null; tmdb_movie_id: number }>((from, to) =>
    db.from("wishlist_items").select("*").eq("user_id", userId).order("id").range(from, to),
  ).catch(() => []);
}

const json = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] });

function capped(list: CopySummary[]) {
  return { total: list.length, shown: Math.min(list.length, MAX_RESULTS), copies: list.slice(0, MAX_RESULTS) };
}

export function buildFilmoryMcpServer(db: SupabaseClient, userId: string) {
  const server = new McpServer(
    { name: "filmory", version: "1.0.0" },
    {
      instructions:
        "Filmory holds the member's physical film collection (DVD, Blu-ray, 4K, boxes, series). " +
        "All tools are read-only and only see this member's own data. Titles are as stored by the member, " +
        "often in Dutch or English. Answer in the member's language.",
    },
  );
  const readOnly = { readOnlyHint: true, openWorldHint: false } as const;

  server.registerTool(
    "zoek_in_collectie",
    {
      title: "Search my collection",
      description:
        "Search the member's own copies by (part of) a title, format (e.g. '4K Ultra HD', 'Blu-ray', 'DVD'), shelf location, watched status or lent out. " +
        "Also answers 'where is X on my shelf' (field location). Returns at most 100 copies.",
      inputSchema: {
        query: z.string().max(200).optional().describe("Part of the title, e.g. 'dune'"),
        format: z.string().max(60).optional(),
        location: z.string().max(80).optional().describe("Part of the shelf location, e.g. 'kast 2'"),
        watched: z.boolean().optional(),
        loaned: z.boolean().optional().describe("true = only copies that are lent out"),
      },
      annotations: readOnly,
    },
    async (args) => {
      const { copies } = await loadCollection(db, userId);
      return json(capped(filterCopies(copies, args)));
    },
  );

  server.registerTool(
    "heb_ik_deze",
    {
      title: "Do I own this?",
      description:
        "Check a film before buying it: by barcode (EAN/UPC from the case) and/or title. Answers owned (this exact release), " +
        "other_edition (the film in another release), on_wishlist, or not_owned.",
      inputSchema: {
        barcode: z.string().max(40).optional(),
        title: z.string().max(200).optional(),
      },
      annotations: readOnly,
    },
    async ({ barcode, title }) => {
      if (!barcode && !title) return { ...json({ error: "Give a barcode or a title." }), isError: true };
      const code = barcode ? cleanImportBarcode(barcode) : undefined;
      const [{ copies }, wishlist, known] = await Promise.all([
        loadCollection(db, userId),
        loadWishlist(db, userId),
        code
          ? db.from("barcodes").select("tmdb_movie_id").eq("barcode", code).eq("is_box", false).limit(1).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      // The film list knows the barcode → compare on that title id.
      const knownId = (known.data as { tmdb_movie_id?: number } | null)?.tmdb_movie_id ?? null;
      return json(ownershipVerdict(copies, wishlist, { barcode: code, title, barcodeTitleId: knownId }));
    },
  );

  server.registerTool(
    "uitgeleend",
    {
      title: "Lent out",
      description: "Which of the member's copies are lent out, to whom and since when (oldest first).",
      inputSchema: {},
      annotations: readOnly,
    },
    async () => {
      const { rows } = await loadCollection(db, userId);
      const seen = new Set<string>();
      const loans = rows
        .filter((r) => r.loaned_to && !seen.has(r.item_group_id) && seen.add(r.item_group_id))
        .map((r) => ({ title: r.movie_title, format: r.type, loanedTo: r.loaned_to, since: r.loaned_at }))
        .sort((a, b) => (a.since ?? "").localeCompare(b.since ?? ""));
      return json({ total: loans.length, loans });
    },
  );

  server.registerTool(
    "statistieken",
    {
      title: "Collection statistics",
      description: "Counts of the member's collection: copies, films/series, per format, watched/unwatched, lent out, and total purchase value (euro).",
      inputSchema: {},
      annotations: readOnly,
    },
    async () => {
      const { rows, copies, collections } = await loadCollection(db, userId);
      return json(collectionStats(copies, rows, collections.size));
    },
  );

  server.registerTool(
    "collecties",
    {
      title: "My collections",
      description: "The member's collections with the number of copies in each.",
      inputSchema: {},
      annotations: readOnly,
    },
    async () => {
      const { rows, collections } = await loadCollection(db, userId);
      const counts = new Map<string, Set<string>>();
      for (const r of rows) counts.set(r.collection_id, (counts.get(r.collection_id) ?? new Set()).add(r.item_group_id));
      return json([...collections].map(([id, name]) => ({ name, copies: counts.get(id)?.size ?? 0 })));
    },
  );

  server.registerTool(
    "verlanglijst",
    {
      title: "My wishlist",
      description: "The member's wishlist, Holy Grails (most wanted) first.",
      inputSchema: {},
      annotations: readOnly,
    },
    async () => {
      const list = (await loadWishlist(db, userId))
        .map((w) => ({ title: w.movie_title, holyGrail: !!w.is_grail, added: w.added_at }))
        .sort((a, b) => Number(b.holyGrail) - Number(a.holyGrail) || (b.added ?? "").localeCompare(a.added ?? ""));
      return json({ total: list.length, items: list.slice(0, 200) });
    },
  );

  return server;
}
