import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

// series_seasons.sql + the seasons guard in add_barcode_later.sql, against
// the real schema and approval SQL (same harness as lib/owned-releases.test.ts).
const OWNER = "10000000-0000-4000-8000-000000000001";
const ADMIN = "10000000-0000-4000-8000-000000000003";
const ONE = "20000000-0000-4000-8000-000000000001";
const ADMIN_COL = "20000000-0000-4000-8000-000000000009";
const SERIES = -1399;
let db: PGlite;
const sql = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

async function asUser(id = OWNER) {
  await db.exec(`reset role; set test.user_id = '${id}'; set role authenticated;`);
}
async function rows(query: string) {
  await db.exec("reset role");
  return (await db.query(query)).rows as Record<string, unknown>[];
}
async function saveBox(seasons: number[] | null) {
  const release = {
    barcode: "5051888260784", type: "Blu-ray", editie: "Normaal", boxName: "Batwoman seizoen 1-2",
    films: [{ tmdb_movie_id: SERIES, movie_title: "Batwoman", movie_poster: null, seasons }],
  };
  await asUser();
  await db.query("select public.save_owned_release($1::jsonb, $2::uuid[])", [JSON.stringify(release), [ONE]]);
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(sql("lib/testing/collection-schema.sql"));
  await db.exec(sql("supabase/sql/approve_pending.sql"));
  const auto = sql("supabase/sql/auto_approve.sql");
  await db.exec(auto.slice(auto.indexOf("create or replace function public.approve_pending_barcode_core")));
  await db.exec(sql("supabase/sql/owned_releases.sql"));
  await db.exec(sql("supabase/sql/add_barcode_later.sql"));
  await db.exec(sql("supabase/sql/series_seasons.sql"));
  await db.exec(sql("supabase/sql/series_seasons.sql"));
}, 30_000);

afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec(`reset role; truncate pending_barcode_collections, pending_barcodes, collection_items, barcodes, collections, trusted_contributors, profiles cascade;
    insert into profiles values ('${OWNER}', false), ('${ADMIN}', true);
    insert into collections values ('${ONE}', '${OWNER}'), ('${ADMIN_COL}', '${ADMIN}');`);
});

describe("series seasons", () => {
  it("refuses to approve a series box without seasons, until an admin sets them", async () => {
    await saveBox(null);
    const [{ id }] = await rows("select id from pending_barcodes");
    await asUser(ADMIN);
    await expect(db.query("select approve_pending_box($1::uuid[])", [[id]])).rejects.toThrow("seasons_required");

    expect((await db.query<{ n: number }>("select admin_set_pending_seasons($1::uuid, $2::int[]) as n", [id, [2, 1, 2]])).rows[0].n).toBe(1);
    expect(await rows("select seasons from pending_barcodes")).toEqual([{ seasons: [1, 2] }]);
    // The submitter's copy gets the seasons too.
    expect(await rows("select seasons from collection_items")).toEqual([{ seasons: [1, 2] }]);

    await asUser(ADMIN);
    await db.query("select approve_pending_box($1::uuid[])", [[id]]);
    // The film list now knows the seasons of this release.
    expect(await rows("select seasons, is_box from barcodes")).toEqual([{ seasons: [1, 2], is_box: true }]);
    expect(await rows("select count(*)::int as n from collection_items")).toEqual([{ n: 1 }]);
  });

  it("keeps the seasons a submitter gave, through approval", async () => {
    await saveBox([1, 2, 3]);
    const [{ id }] = await rows("select id from pending_barcodes");
    await asUser(ADMIN);
    await db.query("select approve_pending_box($1::uuid[])", [[id]]);
    expect(await rows("select seasons from barcodes")).toEqual([{ seasons: [1, 2, 3] }]);
  });

  it("only lets admins set seasons, and only on a series", async () => {
    await saveBox(null);
    const [{ id }] = await rows("select id from pending_barcodes");
    await asUser();
    await expect(db.query("select admin_set_pending_seasons($1::uuid, $2::int[])", [id, [1]])).rejects.toThrow("not_admin");
    await asUser(ADMIN);
    await expect(db.query("select admin_set_pending_seasons($1::uuid, $2::int[])", [id, []])).rejects.toThrow("seasons_required");
  });

  it("doesn't send a series copy without seasons to review via 'add a barcode later'", async () => {
    await db.exec(`reset role; insert into collection_items (collection_id, item_group_id, tmdb_movie_id, movie_title, barcode, type, editie)
      values ('${ONE}', gen_random_uuid(), ${SERIES}, 'Batwoman', '', 'Blu-ray', 'Normaal');`);
    const [{ item_group_id }] = await rows("select item_group_id from collection_items");
    await asUser();
    const r = await db.query<{ r: { status: string } }>("select add_barcode_to_copy($1::uuid, '5051888260784') as r", [item_group_id]);
    expect(r.rows[0].r.status).toBe("seasons_required");
    expect(await rows("select id from pending_barcodes")).toHaveLength(0);
  });
});
