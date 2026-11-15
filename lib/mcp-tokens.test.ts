import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// mcp_tokens.sql in a real Postgres: owner-only rows, hashed tokens,
// resolution and the hourly limit (only for the service role).
const OWNER = "10000000-0000-4000-8000-000000000001";
const OTHER = "10000000-0000-4000-8000-000000000002";
const HASH = "a".repeat(64);
let db: PGlite;

async function as(role: "authenticated" | "service_role" | "anon", id = OWNER) {
  await db.exec(`reset role; set test.user_id = '${id}'; set role ${role};`);
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.user_id', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon, service_role;
    create table public.profiles (id uuid primary key, is_admin boolean default false);
    insert into auth.users values ('${OWNER}'), ('${OTHER}');
    insert into profiles values ('${OWNER}', true), ('${OTHER}', false);
    grant select on public.profiles to authenticated, service_role;
  `);
  await db.exec(readFileSync(new URL("../supabase/sql/mcp_tokens.sql", import.meta.url), "utf8"));
  await db.exec("grant select, insert, update, delete on public.mcp_tokens to authenticated;");
}, 30_000);

afterAll(async () => { await db?.close(); });

describe("mcp_tokens.sql", () => {
  it("lets a member make and see only their own tokens", async () => {
    await as("authenticated");
    await db.query("insert into mcp_tokens (name, token_hash, token_hint) values ('Laptop', $1, 'fvm_abcd…')", [HASH]);
    await as("authenticated", OTHER);
    expect((await db.query("select id from mcp_tokens")).rows).toHaveLength(0);
    await expect(db.query(`insert into mcp_tokens (user_id, name, token_hash, token_hint) values ('${OWNER}', 'x', $1, 'x')`, ["b".repeat(64)])).rejects.toThrow();
  });

  it("resolves a token for the service role only, with a limit", async () => {
    await as("authenticated");
    await expect(db.query("select mcp_use_token($1)", [HASH])).rejects.toThrow(/permission denied/);
    await as("service_role");
    const r = await db.query<{ r: Record<string, unknown> }>("select mcp_use_token($1, 2) as r", [HASH]);
    expect(r.rows[0].r).toEqual({ status: "ok", user_id: OWNER, is_admin: true });
    await db.query("select mcp_use_token($1, 2)", [HASH]);
    expect((await db.query<{ r: { status: string } }>("select mcp_use_token($1, 2) as r", [HASH])).rows[0].r.status).toBe("limited");
    expect((await db.query<{ r: { status: string } }>("select mcp_use_token($1) as r", ["c".repeat(64)])).rows[0].r.status).toBe("invalid");
  });

  it("stops working once revoked", async () => {
    await as("authenticated");
    await db.exec("update mcp_tokens set revoked_at = now()");
    await as("service_role");
    expect((await db.query<{ r: { status: string } }>("select mcp_use_token($1) as r", [HASH])).rows[0].r.status).toBe("invalid");
  });

  it("can run again", async () => {
    await db.exec("reset role");
    await db.exec(readFileSync(new URL("../supabase/sql/mcp_tokens.sql", import.meta.url), "utf8"));
  });
});
