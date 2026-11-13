import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const OWNER = "10000000-0000-4000-8000-000000000001";
const OTHER = "10000000-0000-4000-8000-000000000002";
const ADMIN = "10000000-0000-4000-8000-000000000003";
const ONE = "20000000-0000-4000-8000-000000000001";
const TWO = "20000000-0000-4000-8000-000000000002";
const FOREIGN = "20000000-0000-4000-8000-000000000003";
let db: PGlite;
const sql = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

async function asUser(id = OWNER) {
  await db.exec(`reset role; set test.user_id = '${id}'; set role authenticated;`);
}
async function rows(query: string) {
  await db.exec("reset role");
  return (await db.query(query)).rows as Record<string, unknown>[];
}
function release(barcode = "8712345678901", titleId = 1) {
  return { barcode, type: "Blu-ray", editie: "Normaal", films: [{ tmdb_movie_id: titleId, movie_title: `Film ${titleId}`, movie_poster: null }] };
}
async function save(input = release(), collections = [ONE]) {
  return db.query<{ skipped: string[] }>("select public.save_owned_release($1::jsonb, $2::uuid[]) as skipped", [JSON.stringify(input), collections]);
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(sql("lib/testing/collection-schema.sql"));
  await db.exec(sql("supabase/sql/approve_pending.sql"));
  // Real auto-approval core and ownership checks, without its table setup.
  const auto = sql("supabase/sql/auto_approve.sql");
  await db.exec(auto.slice(auto.indexOf("create or replace function public.approve_pending_barcode_core")));
  await db.exec(sql("supabase/sql/owned_releases.sql"));
  await db.exec(sql("supabase/sql/collection_growth.sql"));
}, 30_000);

afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec(`reset role; truncate collection_growth_events, pending_barcode_collections, pending_barcodes, collection_items, barcodes, collections, trusted_contributors, app_events, profiles cascade;
    insert into profiles values ('${OWNER}', false), ('${OTHER}', false), ('${ADMIN}', true);
    insert into collections values ('${ONE}', '${OWNER}'), ('${TWO}', '${OWNER}'), ('${FOREIGN}', '${OTHER}');`);
  await asUser();
});

describe("immediate ownership and catalogue review", () => {
  it("saves unknown codes immediately, queues once, shares a physical copy and tolerates retries", async () => {
    expect((await save(release(), [ONE, TWO])).rows[0].skipped).toEqual([]);
    expect((await save(release(), [ONE, TWO])).rows[0].skipped).toEqual([ONE, TWO]);
    const items = await rows("select item_group_id, catalog_status from collection_items");
    expect(items).toHaveLength(2);
    expect(new Set(items.map((i) => i.item_group_id)).size).toBe(1);
    expect(items.every((i) => i.catalog_status === "unverified")).toBe(true);
    expect(await rows("select id from pending_barcodes")).toHaveLength(1);
    expect(await rows("select * from pending_barcode_collections")).toHaveLength(2);
    expect(await rows("select * from barcodes")).toHaveLength(0);
  });

  it("allows two different titles without a barcode and does not submit empty codes", async () => {
    await save(release("", 1));
    await save(release("", 2));
    await save(release("", 1));
    expect(await rows("select id from collection_items where catalog_status = 'personal'")).toHaveLength(2);
    expect(await rows("select id from pending_barcodes")).toHaveLength(0);
  });

  it("preserves cuts, regions and language details on an immediately usable copy", async () => {
    await save({ ...release(), details: { cut: "Extended", region: "B", audio_languages: ["en"], subtitle_languages: ["nl"] } } as ReturnType<typeof release>);
    expect((await rows("select cut, region, audio_languages, subtitle_languages from collection_items"))[0]).toEqual({ cut: "Extended", region: "B", audio_languages: ["en"], subtitle_languages: ["nl"] });
  });

  it("keeps different cuts without a barcode as separate physical releases", async () => {
    await save({ ...release(""), details: { cut: "Extended" } } as ReturnType<typeof release>);
    await save({ ...release(""), details: { cut: "Theatrical" } } as ReturnType<typeof release>);
    await save({ ...release(""), details: { cut: "Extended" } } as ReturnType<typeof release>);
    expect(await rows("select cut from collection_items order by cut")).toEqual([{ cut: "Extended" }, { cut: "Theatrical" }]);
  });

  it("rejects a mixed own/foreign target list atomically", async () => {
    await expect(save(release(), [ONE, FOREIGN])).rejects.toThrow("collection_not_owned");
    expect(await rows("select id from collection_items")).toHaveLength(0);
    expect(await rows("select id from pending_barcodes")).toHaveLength(0);
  });

  it("rejects anonymous calls and invalid releases", async () => {
    await db.exec("reset role; set test.user_id = '';");
    await expect(save()).rejects.toThrow("not_authenticated");
    await asUser();
    await expect(save({ ...release(), type: "Made up" })).rejects.toThrow("invalid_release");
    expect(await rows("select id from collection_items")).toHaveLength(0);
  });

  it("approves without duplicating ownership or losing personal notes", async () => {
    await save();
    const [{ id }] = await rows("select id from pending_barcodes");
    await db.exec("update collection_items set personal_note = 'Keep this copy';");
    await asUser(ADMIN);
    await db.query("select approve_pending_barcode($1::uuid)", [id]);
    expect(await rows("select personal_note, catalog_status from collection_items")).toEqual([{ personal_note: "Keep this copy", catalog_status: "verified" }]);
  });

  it("does not let a client mark an unlisted release as catalogue-verified", async () => {
    await save();
    await db.exec("update collection_items set catalog_status = 'verified'");
    expect(await rows("select catalog_status from collection_items")).toEqual([{ catalog_status: "unverified" }]);
  });

  it("retains the private copy after rejection", async () => {
    await save();
    await db.exec("reset role; update pending_barcodes set status = 'rejected';");
    expect(await rows("select id from collection_items")).toHaveLength(1);
  });

  it("keeps trusted contributor auto-approval and avoids duplicate copies", async () => {
    await db.exec(`reset role; insert into trusted_contributors values ('${OWNER}');`);
    await asUser();
    await save();
    expect(await rows("select status from pending_barcodes")).toEqual([{ status: "approved" }]);
    expect(await rows("select catalog_status from collection_items")).toEqual([{ catalog_status: "verified" }]);
  });

  it("saves all films in a box once, then approves the catalogue without duplicating it", async () => {
    const box = { ...release(), boxName: "Double feature", films: [release().films[0], release("", 2).films[0]] };
    await save(box);
    await save(box);
    const pending = await rows("select id from pending_barcodes");
    expect(pending).toHaveLength(2);
    await asUser(ADMIN);
    await db.query("select approve_pending_box($1::uuid[])", [pending.map((p) => p.id)]);
    const items = await rows("select box_group_id, catalog_status from collection_items");
    expect(items).toHaveLength(2);
    expect(new Set(items.map((i) => i.box_group_id)).size).toBe(1);
    expect(items.every((i) => i.catalog_status === "verified")).toBe(true);
  });

  it("can rerun both migrations safely", async () => {
    await db.exec("reset role");
    await db.exec(sql("supabase/sql/owned_releases.sql"));
    await db.exec(sql("supabase/sql/collection_growth.sql"));
  });
});

describe("collection growth measurement", () => {
  it("logs real member saves once per physical copy, not queued submissions or admin approvals", async () => {
    await save(release(), [ONE, TWO]);
    expect(await rows("select kind from collection_growth_events")).toEqual([{ kind: "saved" }]);
    const [{ id }] = await rows("select id from pending_barcodes");
    await asUser(ADMIN);
    await db.query("select approve_pending_barcode($1::uuid)", [id]);
    expect(await rows("select kind from collection_growth_events")).toEqual([{ kind: "saved" }]);
  });

  it("requires an admin to read metrics and disallows direct member event injection", async () => {
    await expect(db.query("select admin_collection_growth_stats()" )).rejects.toThrow("not_admin");
    await expect(db.exec(`insert into collection_growth_events (user_id, tmdb_movie_id, item_group_id, kind) values ('${OWNER}', 1, gen_random_uuid(), 'saved')`)).rejects.toThrow("permission denied");
  });

  it("uses distinct titles and mature 7/30 day cohorts, including returning updates", async () => {
    await db.exec(`reset role;
      update private.collection_growth_config set started_at = now() - interval '60 days';
      insert into app_events (user_id, event, source, created_at) values
        ('${OWNER}', 'signup', 'community', now() - interval '35 days'),
        ('${OTHER}', 'signup', 'community', now() - interval '2 days');
      insert into collection_growth_events (user_id, tmdb_movie_id, item_group_id, kind, occurred_at)
        select '${OWNER}', n, gen_random_uuid(), 'saved', now() - interval '34 days' from generate_series(1,5) n;
      insert into collection_growth_events (user_id, tmdb_movie_id, item_group_id, kind, occurred_at) values
        ('${OWNER}', 1, gen_random_uuid(), 'saved', now() - interval '34 days'),
        ('${OWNER}', 1, gen_random_uuid(), 'updated', now() - interval '20 days'),
        ('${OTHER}', 1, gen_random_uuid(), 'saved', now() - interval '1 day');`);
    await asUser(ADMIN);
    const { rows: [r] } = await db.query<{ stats: Record<string, unknown> }>("select admin_collection_growth_stats() as stats");
    expect(r.stats).toMatchObject({ signups: 2, first_success: 2, activation_cohort: 1, activated: 1, return_cohort: 1, returned: 1 });
    expect(r.stats.by_source).toEqual([{ source: "community", signups: 2, activation_cohort: 1, activated: 1, return_cohort: 1, returned: 1 }]);
  });
});
