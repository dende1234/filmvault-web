import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  collections: [{ id: "mine", user_id: "owner", name: "My shelf" }, { id: "theirs", user_id: "other", name: "Other shelf" }],
  items: [] as Record<string, unknown>[],
  inserts: [] as Record<string, unknown>[],
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUserId: async () => "owner" }));
vi.mock("@/lib/preferences", () => ({ getLocale: async () => "nl" }));
vi.mock("@/lib/tmdb/server", () => ({ getTitleDetail: async () => ({ title: "Example film", poster_path: null }) }));
vi.mock("@/actions/collections", () => ({ getCollectionIdsContainingBarcode: async () => new Set(), getCollectionIdsContainingMovie: vi.fn() }));
vi.mock("@/actions/owned-releases", () => ({ saveOwnedRelease: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) },
    from(table: string) {
      let data: Record<string, unknown>[] = table === "collections" ? [...state.collections] : table === "collection_items" ? [...state.items] : [];
      const query = {
        select() { return query; },
        eq(key: string, value: unknown) {
          data = data.filter((r) => key === "collections.user_id"
            ? state.collections.some((c) => c.id === r.collection_id && c.user_id === value)
            : r[key] === value);
          return query;
        },
        in(key: string, values: unknown[]) { data = data.filter((r) => values.includes(r[key])); return query; },
        order() { return query; },
        range(from: number, to: number) { data = data.slice(from, to + 1); return query; },
        insert(records: Record<string, unknown>[]) { state.inserts.push(...records); return query; },
        then(resolve: (result: { data: Record<string, unknown>[]; error: null }) => unknown) { return Promise.resolve(resolve({ data, error: null })); },
      };
      return query;
    },
  }),
}));

import { addExistingBarcodesToCollections, lookupScannedBarcode } from "@/actions/barcodes";

const copy = { id: "copy", collection_id: "mine", item_group_id: "group", tmdb_movie_id: 1,
  movie_title: "Example film", movie_poster: null, barcode: "12345678", type: "Blu-ray", editie: "Normaal",
  added_at: null, is_box: false, box_group_id: null, box_name: null, catalog_status: "unverified" };

beforeEach(() => { state.items = []; state.inserts = []; });

describe("adding an approved edition to another collection", () => {
  const barcode = { id: "catalogue-row", tmdb_movie_id: 1, barcode: "12345678", type: "Blu-ray", editie: "Normaal",
    created_at: null, is_box: false, box_group_id: null, box_name: null };

  it("keeps an existing own copy as one physical item across separate additions", async () => {
    state.items = [
      { ...copy, collection_id: "theirs", item_group_id: "foreign-group" },
      copy,
    ];
    await addExistingBarcodesToCollections([barcode], 1, "Example film", null, ["second-collection"]);
    expect(state.inserts).toHaveLength(1);
    expect(state.inserts[0].collection_id).toBe("second-collection");
    expect(new Set([copy.item_group_id, ...state.inserts.map((r) => r.item_group_id)]).size).toBe(1);
  });

  it("never reuses another member's physical-copy identity", async () => {
    state.items = [{ ...copy, collection_id: "theirs", item_group_id: "foreign-group" }];
    await addExistingBarcodesToCollections([barcode], 1, "Example film", null, ["mine"]);
    expect(state.inserts).toHaveLength(1);
    expect(state.inserts[0].item_group_id).not.toBe("foreign-group");
  });
});
describe("scanning copies before catalogue approval", () => {
  it("recognises an owned unlisted barcode and keeps its unverified provenance", async () => {
    state.items = [copy];
    const result = await lookupScannedBarcode("12345678");
    expect(result.kind).toBe("title");
    if (result.kind !== "title") throw new Error("Expected a title");
    expect(result.owned).toHaveLength(1);
    expect(result.barcodeRow.catalog_status).toBe("unverified");
    expect(result.owned[0].collections).toEqual(["My shelf"]);
  });
  it("does not reveal another member's unlisted barcode", async () => {
    state.items = [{ ...copy, collection_id: "theirs" }];
    expect(await lookupScannedBarcode("12345678")).toEqual({ kind: "none", barcode: "12345678" });
  });
  it("recognises an unlisted owned box without losing its films", async () => {
    state.items = [
      { ...copy, is_box: true, box_group_id: "box", box_name: "Double feature" },
      { ...copy, id: "copy2", item_group_id: "group2", tmdb_movie_id: 2, is_box: true, box_group_id: "box", box_name: "Double feature" },
    ];
    const result = await lookupScannedBarcode("12345678");
    expect(result.kind).toBe("box");
    if (result.kind !== "box") throw new Error("Expected a box");
    expect(result.films.map((f) => f.tmdb_movie_id)).toEqual([1, 2]);
    expect(result.owned).toHaveLength(1);
  });
});
