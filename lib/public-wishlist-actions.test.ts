import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  cookie: undefined as string | undefined,
  writes: [] as { name: string; value: string; options: Record<string, unknown> }[],
  calls: [] as { name: string; args: Record<string, unknown> }[],
  results: [] as { data: unknown; error: { code: string } | null }[],
}));
vi.mock("next/headers", () => ({ cookies: async () => ({
  get: () => state.cookie ? { value: state.cookie } : undefined,
  set: (name: string, value: string, options: Record<string, unknown>) => {
    state.cookie = value; state.writes.push({ name, value, options });
  },
}) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUserId: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  rpc: async (name: string, args: Record<string, unknown>) => {
    state.calls.push({ name, args });
    return state.results.shift() ?? { data: "reserved", error: null };
  },
}) }));

import { setPublicWishlistReservation } from "@/actions/public-wishlist";
import { getPublicWishlist } from "@/actions/wishlist";

const OWNER = "10000000-0000-4000-8000-000000000001";
beforeEach(() => { state.cookie = undefined; state.writes = []; state.calls = []; state.results = []; });

describe("guest wishlist server actions", () => {
  it("creates an HttpOnly guest secret on the first mark without requiring an account", async () => {
    expect(await setPublicWishlistReservation(OWNER, 42, true)).toEqual({ error: null });
    expect(state.writes).toHaveLength(1);
    expect(state.cookie).toMatch(/^[0-9a-f]{64}$/);
    expect(state.writes[0]).toMatchObject({ name: "fv_wishlist_guest", options: { httpOnly: true, sameSite: "lax", path: "/v/" } });
    expect(state.calls[0]).toEqual({ name: "set_public_wishlist_reservation", args: {
      p_user_id: OWNER, p_tmdb_movie_id: 42, p_reserved: true, p_token: state.cookie,
    } });
  });
  it("uses the same secret to undo a mark", async () => {
    state.cookie = "a".repeat(64);
    state.results = [{ data: "released", error: null }];
    expect(await setPublicWishlistReservation(OWNER, 42, false)).toEqual({ error: null });
    expect(state.writes).toHaveLength(0);
    expect(state.calls[0].args).toMatchObject({ p_token: "a".repeat(64), p_reserved: false });
  });
  it("rejects invalid action arguments before touching cookies or the database", async () => {
    expect(await setPublicWishlistReservation("not-a-user", 42, true)).toEqual({ error: "invalid" });
    expect(await setPublicWishlistReservation(OWNER, 0, true)).toEqual({ error: "invalid" });
    expect(state.calls).toHaveLength(0);
    expect(state.writes).toHaveLength(0);
  });
  it("reports another recipient winning the reservation instead of claiming success", async () => {
    state.results = [{ data: "taken", error: null }];
    expect(await setPublicWishlistReservation(OWNER, 42, true)).toEqual({ error: "taken" });
  });
  it("reports a missing migration without claiming that a mark was saved", async () => {
    state.results = [{ data: null, error: { code: "PGRST202" } }];
    expect(await setPublicWishlistReservation(OWNER, 42, true)).toEqual({ error: "not_ready" });
  });
  it("reads guest-specific permissions using only the server cookie", async () => {
    state.cookie = "a".repeat(64);
    const result = { owner_id: OWNER, items: [], reservations_ready: true };
    state.results = [{ data: result, error: null }];
    expect(await getPublicWishlist(OWNER)).toEqual(result);
    expect(state.calls[0].args.p_token).toBe(state.cookie);
  });
  it("falls back to the old public read until the migration is applied", async () => {
    state.results = [{ data: null, error: { code: "PGRST202" } }, { data: { owner_id: OWNER, items: [] }, error: null }];
    expect(await getPublicWishlist(OWNER)).toMatchObject({ reservations_ready: false, items: [] });
    expect(state.calls.map((c) => c.name)).toEqual(["get_public_wishlist_with_reservations", "get_public_wishlist"]);
  });
});
