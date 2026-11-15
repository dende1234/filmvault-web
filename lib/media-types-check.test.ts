import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// media_types_check.sql: an old fixed list on collection_items.type is
// replaced by a check against media_types, so admin-added formats work.
let db: PGlite;
const sql = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create table media_types (name text primary key);
    create table edities (name text primary key);
    insert into media_types values ('DVD'), ('Blu-ray'), ('4K Ultra HD');
    insert into edities values ('Normaal'), ('Steelbook');
    create table collection_items (id serial primary key, type text, editie text,
      constraint collection_items_type_check check (type in ('DVD', 'Blu-ray', '4K Ultra HD')),
      constraint collection_items_editie_check check (editie in ('Normaal', 'Steelbook')));
    create table pending_barcodes (id serial primary key, type text, editie text);
    create table barcodes (id serial primary key, type text, editie text,
      constraint barcodes_type_check check (type in ('DVD', 'Blu-ray', '4K Ultra HD')));
    insert into collection_items (type, editie) values ('DVD', 'Normaal');
    insert into media_types values ('4K Ultra HD + Blu-ray');
  `);
}, 30_000);

afterAll(async () => { await db?.close(); });

describe("media_types_check.sql", () => {
  it("reproduces the error before the migration", async () => {
    await expect(db.exec("insert into collection_items (type, editie) values ('4K Ultra HD + Blu-ray', 'Normaal')")).rejects.toThrow(/collection_items_type_check/);
  });

  it("accepts admin-added types afterwards and still refuses unknown ones", async () => {
    await db.exec(sql("supabase/sql/media_types_check.sql"));
    await db.exec(sql("supabase/sql/media_types_check.sql"));
    await db.exec("insert into collection_items (type, editie) values ('4K Ultra HD + Blu-ray', 'Normaal')");
    await db.exec("insert into barcodes (type, editie) values ('4K Ultra HD + Blu-ray', 'Steelbook')");
    await expect(db.exec("insert into collection_items (type, editie) values ('Laserdisc', 'Normaal')")).rejects.toThrow(/unknown media type/);
    await expect(db.exec("insert into pending_barcodes (type, editie) values ('DVD', 'Made up')")).rejects.toThrow(/unknown edition/);
    await db.exec("insert into collection_items (type, editie) values (null, '')");
  });

  it("doesn't block existing copies when a type is removed later", async () => {
    await db.exec("delete from media_types where name = 'DVD'");
    await db.exec("update collection_items set editie = 'Steelbook' where type = 'DVD'");
    expect((await db.query("select count(*)::int as n from collection_items where type = 'DVD'")).rows).toEqual([{ n: 1 }]);
  });
});
