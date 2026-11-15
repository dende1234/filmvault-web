"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isMissingError } from "@/lib/admin/migrations";

const inputSchema = z.object({ userId: z.uuid(), titleId: z.number().int().refine((id) => id !== 0), reserved: z.boolean() });

/** The guest secret lives in an HttpOnly cookie, not a share URL or a client
 * payload. The database independently checks that the list is still shared,
 * the wish belongs to it, and that only this guest/the owner can undo a mark. */
export async function setPublicWishlistReservation(
  userId: string, titleId: number, reserved: boolean,
): Promise<{ error: "invalid" | "not_ready" | "taken" | "not_allowed" | "unavailable" | "failed" | null }> {
  const parsed = inputSchema.safeParse({ userId, titleId, reserved });
  if (!parsed.success) return { error: "invalid" };
  const store = await cookies();
  const previous = store.get("fv_wishlist_guest")?.value;
  const token = previous && /^[0-9a-f]{64}$/.test(previous) ? previous : randomBytes(32).toString("hex");
  if (token !== previous) store.set("fv_wishlist_guest", token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/v/", maxAge: 60 * 60 * 24 * 365,
  });
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("set_public_wishlist_reservation", {
      p_user_id: parsed.data.userId, p_tmdb_movie_id: parsed.data.titleId,
      p_token: token, p_reserved: parsed.data.reserved,
    });
    if (error) return { error: isMissingError(error) ? "not_ready" : "failed" };
    revalidatePath(`/v/${parsed.data.userId}`);
    if (data === "reserved" || data === "released") return { error: null };
    if (data === "taken" || data === "not_allowed" || data === "unavailable" || data === "invalid") return { error: data };
    return { error: "failed" };
  } catch {
    return { error: "failed" };
  }
}
