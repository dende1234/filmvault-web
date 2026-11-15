import { existsSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const OWNER = "10000000-0000-4000-8000-000000000001";
const PRIVATE_OWNER = "10000000-0000-4000-8000-000000000002";
const TOKEN_A = "a".repeat(64);
const TOKEN_B = "b".repeat(64);
let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create schema auth;
    grant usage on schema auth to anon, authenticated;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.user_id', true), '')::uuid $$;
    create table profiles (id uuid primary key, name text, avatar_url text, wishlist_public boolean default false);
    create table wishlist_items (
      id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id), tmdb_movie_id int,
      movie_title text, movie_poster text, seasons int[], is_grail boolean default false,
      added_at timestamptz default now(), unique (user_id, tmdb_movie_id)
    );
    alter table wishlist_items enable row level security;
    grant select, insert, update, delete on wishlist_items to authenticated;
    create policy own_wishlist on wishlist_items to authenticated
      using (user_id = auth.uid()) with check (user_id = auth.uid());
  `);
  await db.exec(readFileSync(new URL("../supabase/sql/public_wishlist.sql", import.meta.url), "utf8"));
  const migration = new URL("../supabase/sql/wishlist_reservations.sql", import.meta.url);
  if (existsSync(migration)) await db.exec(readFileSync(migration, "utf8"));
}, 30_000);
afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec(`reset role; set test.user_id = '';
    truncate profiles, wishlist_items cascade;
    insert into profiles values ('${OWNER}', 'Collector', null, true), ('${PRIVATE_OWNER}', 'Private', null, false);
    insert into wishlist_items (user_id, tmdb_movie_id, movie_title) values
      ('${OWNER}', 42, 'A wanted film'), ('${PRIVATE_OWNER}', 43, 'A private film');
    set role anon;
  `);
});

async function mark(userId = OWNER, titleId = 42, token = TOKEN_A, checked = true) {
  const { rows } = await db.query<{ result: string }>(
    "select set_public_wishlist_reservation($1::uuid, $2::int, $3::text, $4::boolean) as result",
    [userId, titleId, token, checked],
  );
  return rows[0].result;
}
async function read(token: string | null = TOKEN_A, userId = OWNER) {
  const { rows } = await db.query<{ result: { reservations_ready: boolean; items: { tmdb_movie_id: number; is_reserved: boolean; reserved_by_you: boolean; can_release: boolean }[] } | null }>(
    "select get_public_wishlist_with_reservations($1::uuid, $2::text) as result", [userId, token],
  );
  return rows[0].result;
}

describe("recipients crossing items off a shared wishlist", () => {
  it("lets a recipient without an account mark a wish and persists it for another recipient", async () => {
    expect(await mark()).toBe("reserved");
    expect((await read(TOKEN_B))?.items[0].is_reserved).toBe(true);
    await db.exec("reset role");
    expect((await db.query("select id from wishlist_items where tmdb_movie_id = 42")).rows).toHaveLength(1);
  });

  it("allows the same browser to undo its mark and makes the item available again", async () => {
    await mark();
    expect((await read())?.items[0]).toMatchObject({ is_reserved: true, reserved_by_you: true, can_release: true });
    expect(await mark(OWNER, 42, TOKEN_A, false)).toBe("released");
    expect((await read(TOKEN_B))?.items[0].is_reserved).toBe(false);
  });

  it("does not let a second recipient undo someone else's mark", async () => {
    await mark();
    expect((await read(TOKEN_B))?.items[0]).toMatchObject({ is_reserved: true, reserved_by_you: false, can_release: false });
    expect(await mark(OWNER, 42, TOKEN_B, false)).toBe("not_allowed");
    expect((await read())?.items[0].is_reserved).toBe(true);
  });

  it("does not give two recipients the same gift and treats retries as idempotent", async () => {
    const results = await Promise.all([mark(), mark(OWNER, 42, TOKEN_B)]);
    expect(results.sort()).toEqual(["reserved", "taken"]);
    expect(await mark()).toBe("reserved");
  });

  it("keeps private wishlists unreadable and unchangeable", async () => {
    expect(await read(TOKEN_A, PRIVATE_OWNER)).toBeNull();
    expect(await mark(PRIVATE_OWNER, 43)).toBe("unavailable");
    expect(await mark(OWNER, 43)).toBe("unavailable");
    await expect(db.exec("select * from wishlist_items")).rejects.toThrow("permission denied");
    await expect(db.exec("select * from private.wishlist_reservations")).rejects.toThrow("permission denied");
  });

  it("stops reservations immediately when the owner turns sharing off", async () => {
    await mark();
    await db.exec(`reset role; update profiles set wishlist_public = false where id = '${OWNER}'; set role anon;`);
    expect(await read()).toBeNull();
    expect(await mark(OWNER, 42, TOKEN_A, false)).toBe("unavailable");
    expect(await mark(OWNER, 42, TOKEN_B)).toBe("unavailable");
  });

  it("lets the signed-in owner clear a mark without granting that power to another account", async () => {
    await mark();
    await db.exec(`reset role; set test.user_id = '${PRIVATE_OWNER}'; set role authenticated;`);
    expect(await mark(OWNER, 42, TOKEN_B, false)).toBe("not_allowed");
    await db.exec(`reset role; set test.user_id = '${OWNER}'; set role authenticated;`);
    expect((await read(TOKEN_B))?.items[0].can_release).toBe(true);
    expect(await mark(OWNER, 42, TOKEN_B, false)).toBe("released");
  });

  it("rejects invalid guest secrets and never exposes tokens or their hashes", async () => {
    expect(await mark(OWNER, 42, "short")).toBe("invalid");
    await mark();
    const publicData = JSON.stringify(await read(TOKEN_B));
    expect(publicData).not.toContain(TOKEN_A);
    expect(publicData).not.toContain("token_hash");
    expect((await read(null))?.items[0].can_release).toBe(false);
  });

  it("removes the reservation when its wish is deleted", async () => {
    await mark();
    await db.exec(`reset role; set test.user_id = '${OWNER}'; set role authenticated;
      delete from wishlist_items where tmdb_movie_id = 42;
      reset role; insert into wishlist_items (user_id, tmdb_movie_id, movie_title) values ('${OWNER}', 42, 'Wanted again');
      set role anon;`);
    expect((await read(TOKEN_B))?.items[0].is_reserved).toBe(false);
  });

  it("keeps the original read-only API compatible and the migration rerunnable", async () => {
    await mark();
    const { rows } = await db.query<{ result: { items: unknown[] } }>("select get_public_wishlist($1::uuid) as result", [OWNER]);
    expect(rows[0].result.items).toHaveLength(1);
    await db.exec("reset role");
    await db.exec(readFileSync(new URL("../supabase/sql/wishlist_reservations.sql", import.meta.url), "utf8"));
    await db.exec("set role anon");
    expect((await read())?.items[0].is_reserved).toBe(true);
  });
});
