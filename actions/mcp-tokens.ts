"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/auth";
import { featureOn } from "@/lib/features";
import { isMissingError } from "@/lib/admin/migrations";
import { generateMcpToken } from "@/lib/mcp/token";

export type McpTokenRow = { id: string; name: string; token_hint: string; created_at: string; last_used_at: string | null };

const MAX_ACTIVE = 5;

/** Your active MCP tokens (mcp_tokens.sql); null before that file has run. */
export async function getMcpTokens(): Promise<McpTokenRow[] | null> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mcp_tokens")
    .select("id, name, token_hint, created_at, last_used_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  if (isMissingError(error)) return null;
  if (error) throw error;
  return data as McpTokenRow[];
}

/** Makes a token; the plain token is returned once and never stored. */
export async function createMcpToken(
  name: string,
): Promise<{ token: string } | { error: "not_allowed" | "not_ready" | "invalid" | "too_many" | "failed" }> {
  const userId = await requireUserId();
  if (!(await featureOn("mcp"))) return { error: "not_allowed" };
  const parsed = z.string().trim().min(1).max(60).safeParse(name);
  if (!parsed.success) return { error: "invalid" };
  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("mcp_tokens")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("revoked_at", null);
  if (isMissingError(countError)) return { error: "not_ready" };
  if ((count ?? 0) >= MAX_ACTIVE) return { error: "too_many" };
  const { token, hash, hint } = generateMcpToken();
  const { error } = await supabase.from("mcp_tokens").insert({ user_id: userId, name: parsed.data, token_hash: hash, token_hint: hint });
  if (error) return { error: isMissingError(error) ? "not_ready" : "failed" };
  revalidatePath("/profile");
  return { token };
}

/** Stops a token at once; the assistant using it loses access. */
export async function revokeMcpToken(id: string): Promise<{ error: "failed" | null }> {
  const userId = await requireUserId();
  if (!z.uuid().safeParse(id).success) return { error: "failed" };
  const supabase = await createClient();
  const { error } = await supabase.from("mcp_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
  revalidatePath("/profile");
  return { error: error ? "failed" : null };
}
