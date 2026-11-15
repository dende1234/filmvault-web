import { describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("server-only", () => ({}));
const { buildFilmoryMcpServer } = await import("@/lib/mcp/server");

// A tiny stand-in for the Supabase query builder over in-memory tables, so
// the real MCP protocol and tools run without a database.
type Row = Record<string, unknown>;
function fakeDb(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      let rows = [...(tables[table] ?? [])];
      let one = false;
      const q = {
        select: () => q,
        eq: (c: string, v: unknown) => ((rows = rows.filter((r) => r[c] === v)), q),
        in: (c: string, v: unknown[]) => ((rows = rows.filter((r) => v.includes(r[c]))), q),
        is: (c: string, v: unknown) => ((rows = rows.filter((r) => (r[c] ?? null) === v)), q),
        order: () => q,
        limit: (n: number) => ((rows = rows.slice(0, n)), q),
        range: (a: number, b: number) => ((rows = rows.slice(a, b + 1)), q),
        maybeSingle: () => ((one = true), q),
        then: (resolve: (v: { data: unknown; error: null }) => unknown) => resolve({ data: one ? (rows[0] ?? null) : rows, error: null }),
      };
      return q;
    },
  } as unknown as SupabaseClient;
}

const ME = "u1";
const copy = (o: Row): Row => ({
  item_group_id: "g1", collection_id: "c1", tmdb_movie_id: 693134, movie_title: "Dune: Part Two", barcode: "5051888270935",
  type: "4K Ultra HD", editie: "Steelbook", watched: true, rating: 4.5, loaned_to: null, loaned_at: null,
  shelf_location: "Woonkamer · kast 2", purchase_price: 30, is_box: false, box_name: null, ...o,
});
const db = fakeDb({
  collections: [
    { id: "c1", user_id: ME, name: "Woonkamer" },
    { id: "cX", user_id: "someone-else", name: "Niet van mij" },
  ],
  collection_items: [
    copy({ id: 1 }),
    copy({ id: 2, item_group_id: "g2", tmdb_movie_id: 1858, movie_title: "Transformers", barcode: "", type: "DVD", editie: "Normaal", watched: false, loaned_to: "Sanne", loaned_at: "2026-09-01" }),
    copy({ id: 3, item_group_id: "gX", collection_id: "cX", movie_title: "Secret film of someone else" }),
  ],
  wishlist_items: [
    { id: 1, user_id: ME, tmdb_movie_id: 11, movie_title: "Star Wars", is_grail: true, added_at: "2026-01-01" },
    { id: 2, user_id: "someone-else", tmdb_movie_id: 12, movie_title: "Finding Nemo", is_grail: false, added_at: null },
  ],
  barcodes: [{ barcode: "1234567890128", tmdb_movie_id: 693134, is_box: false }],
});

async function connect() {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await buildFilmoryMcpServer(db, ME).connect(serverSide);
  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(clientSide);
  return client;
}
async function call(client: Client, name: string, args: Row = {}) {
  const r = await client.callTool({ name, arguments: args });
  return JSON.parse((r.content as { text: string }[])[0].text);
}

describe("Filmory MCP server", () => {
  it("lists only read-only tools", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["collecties", "heb_ik_deze", "statistieken", "uitgeleend", "verlanglijst", "zoek_in_collectie"]);
    expect(tools.every((t) => t.annotations?.readOnlyHint)).toBe(true);
  });

  it("answers from the member's own data only", async () => {
    const client = await connect();
    const all = await call(client, "zoek_in_collectie");
    expect(all.copies.map((c: Row) => c.title).sort()).toEqual(["Dune: Part Two", "Transformers"]);
    expect((await call(client, "zoek_in_collectie", { location: "kast 2" })).copies[0].location).toBe("Woonkamer · kast 2");
    expect(await call(client, "collecties")).toEqual([{ name: "Woonkamer", copies: 2 }]);
    expect((await call(client, "verlanglijst")).items.map((w: Row) => w.title)).toEqual(["Star Wars"]);
    expect((await call(client, "uitgeleend")).loans).toEqual([{ title: "Transformers", format: "DVD", loanedTo: "Sanne", since: "2026-09-01" }]);
    expect(await call(client, "statistieken")).toMatchObject({ copies: 2, loanedOut: 1, totalPurchaseValue: 60 });
  });

  it("checks a barcode like shop mode", async () => {
    const client = await connect();
    expect((await call(client, "heb_ik_deze", { barcode: "5051888270935" })).status).toBe("owned");
    expect((await call(client, "heb_ik_deze", { barcode: "EAN13|1234567890128" })).status).toBe("other_edition");
    expect((await call(client, "heb_ik_deze", { title: "Star Wars" })).status).toBe("on_wishlist");
    expect((await call(client, "heb_ik_deze", { title: "Secret film of someone else" })).status).toBe("not_owned");
  });
});

// As app/api/mcp/route.ts does it: a fresh server and stateless transport per
// HTTP request, JSON responses.
async function post(body: Row) {
  const server = buildFilmoryMcpServer(db, ME);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  const res = await transport.handleRequest(
    new Request("https://www.filmory.nl/api/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-protocol-version": "2025-06-18" },
      body: JSON.stringify(body),
    }),
  );
  await server.close();
  return { status: res.status, body: await res.json() };
}

describe("over HTTP (stateless)", () => {
  it("initializes and calls a tool in separate requests", async () => {
    const init = await post({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } } });
    expect(init.status).toBe(200);
    expect(init.body.result.serverInfo.name).toBe("filmory");
    const res = await post({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "statistieken", arguments: {} } });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body.result.content[0].text).copies).toBe(2);
  });
});
