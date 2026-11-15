import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

// add_barcode_later.sql against the real schema/approval SQL (same harness as
// lib/owned-releases.test.ts).
const OWNER = "10000000-0000-4000-8000-000000000001";
const OTHER = "10000000-0000-4000-8000-000000000002";
const ADMIN = "10000000-0000-4000-8000-000000000003";
const ONE = "20000000-0000-4000-8000-000000000001";
const TWO = "20000000-0000-4000-8000-000000000002";
const FOREIGN = "20000000-0000-4000-8000-000000000003";
const CODE = "8712626050162";
let db: PGlite;
const sql = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

async function asUser(id = OWNER) {
  await db.exec(`reset role; set test.user_id = '${id}'; set role authenticated;`);
}
async function rows(query: string) {
  await db.exec("reset role");
  return (await db.query(query)).rows as Record<string, unknown>[];
}
async function savePersonal(titleId = 1, collections = [ONE]) {
  const release = { barcode: "", type: "Blu-ray", editie: "Normaal", films: [{ tmdb_movie_id: titleId, movie_title: `Film ${titleId}`, movie_poster: null }] };
  await db.query("select public.save_owned_release($1::jsonb, $2::uuid[])", [JSON.stringify(release), collections]);
  const [{ item_group_id }] = await rows(`select item_group_id from collection_items where tmdb_movie_id = ${titleId} limit 1`);
  await asUser();
  return item_group_id as string;
}
async function addBarcode(group: string, code = CODE) {
  const r = await db.query<{ r: { status: string } & Record<string, unknown> }>("select public.add_barcode_to_copy($1::uuid, $2) as r", [group, code]);
  return r.rows[0].r;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(sql("lib/testing/collection-schema.sql"));
  await db.exec(sql("supabase/sql/approve_pending.sql"));
  const auto = sql("supabase/sql/auto_approve.sql");
  await db.exec(auto.slice(auto.indexOf("create or replace function public.approve_pending_barcode_core")));
  await db.exec(sql("supabase/sql/owned_releases.sql"));
  await db.exec(sql("supabase/sql/add_barcode_later.sql"));
}, 30_000);

afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec(`reset role; truncate pending_barcode_collections, pending_barcodes, collection_items, barcodes, collections, trusted_contributors, profiles cascade;
    insert into profiles values ('${OWNER}', false), ('${OTHER}', false), ('${ADMIN}', true);
    insert into collections values ('${ONE}', '${OWNER}'), ('${TWO}', '${OWNER}'), ('${FOREIGN}', '${OTHER}');`);
  await asUser();
});

describe("adding a barcode later", () => {
  it("submits an unknown barcode for review on every collection of the copy, without duplicating on approval", async () => {
    const group = await savePersonal(1, [ONE, TWO]);
    expect(await addBarcode(group)).toEqual({ status: "pending" });
    expect(await rows("select barcode, catalog_status from collection_items")).toEqual([
      { barcode: CODE, catalog_status: "unverified" },
      { barcode: CODE, catalog_status: "unverified" },
    ]);
    const pending = await rows("select id, status from pending_barcodes");
    expect(pending).toHaveLength(1);
    expect(await rows("select collection_id from pending_barcode_collections order by collection_id")).toEqual([{ collection_id: ONE }, { collection_id: TWO }]);

    await asUser(ADMIN);
    await db.query("select approve_pending_barcode($1::uuid)", [pending[0].id]);
    expect(await rows("select catalog_status from collection_items")).toEqual([{ catalog_status: "verified" }, { catalog_status: "verified" }]);
  });

  it("verifies a barcode the film list knows for this title, and takes its release", async () => {
    await db.exec(`reset role; insert into barcodes (barcode, tmdb_movie_id, type, editie, is_box) values ('${CODE}', 1, '4K Ultra HD', 'Steelbook', false);`);
    const group = await savePersonal(1);
    expect(await addBarcode(group)).toEqual({ status: "verified", type: "4K Ultra HD", editie: "Steelbook" });
    expect(await rows("select type, editie, catalog_status from collection_items")).toEqual([{ type: "4K Ultra HD", editie: "Steelbook", catalog_status: "verified" }]);
    expect(await rows("select id from pending_barcodes")).toHaveLength(0);
  });

  it("refuses a barcode that belongs to another title", async () => {
    await db.exec(`reset role; insert into barcodes (barcode, tmdb_movie_id, type, editie, is_box) values ('${CODE}', 2, 'Blu-ray', 'Normaal', false);`);
    const group = await savePersonal(1);
    expect(await addBarcode(group)).toMatchObject({ status: "conflict", tmdb_movie_id: 2 });
    expect(await rows("select barcode from collection_items")).toEqual([{ barcode: "" }]);
  });

  it("only works on your own copy without a barcode", async () => {
    const group = await savePersonal(1);
    await addBarcode(group);
    expect(await addBarcode(group, "5051888270935")).toEqual({ status: "has_barcode" });
    await asUser(OTHER);
    expect(await addBarcode(group, "5051888270935")).toEqual({ status: "not_found" });
    await asUser();
    expect(await addBarcode(group, "12")).toEqual({ status: "invalid" });
  });

  it("auto-approves for a trusted contributor", async () => {
    await db.exec(`reset role; insert into trusted_contributors values ('${OWNER}');`);
    const group = await savePersonal(1);
    expect(await addBarcode(group)).toEqual({ status: "verified" });
    expect(await rows("select catalog_status from collection_items")).toEqual([{ catalog_status: "verified" }]);
  });
});
