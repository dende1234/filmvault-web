"use server";

// Admin-managed lookup lists backing every type/editie dropdown in the app
// (see supabase/sql/media_types_and_edities.sql). Renaming cascades to every
// existing barcode/collection_item automatically via the FK's ON UPDATE
// CASCADE — these actions only ever touch the lookup tables themselves.
// Deleting a value still in use is blocked server-side (ON DELETE RESTRICT,
// surfaced here as a discriminated "in_use" result instead of a thrown
// error, since a Server Action's thrown error doesn't reliably carry custom
// fields like .code across the client boundary — same precedent as
// actions/admin.ts's adminRegisterBarcodeWithConflictTitle).

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";

type MutationResult = { error: "other" | null };
type DeleteResult = { error: "in_use" | "other" | null };

function isForeignKeyViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: unknown }).code === "23503";
}

export async function getMediaTypes(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("media_types").select("name, sort_order").order("sort_order");
  if (error) throw error;
  return data.map((row) => row.name);
}

export async function getEdities(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("edities").select("name, sort_order").order("sort_order");
  if (error) throw error;
  return data.map((row) => row.name);
}

export async function createMediaType(name: string): Promise<MutationResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { count } = await supabase.from("media_types").select("*", { count: "exact", head: true });
  const { error } = await supabase.from("media_types").insert({ name, sort_order: count ?? 0 });
  return { error: error ? "other" : null };
}

export async function renameMediaType(oldName: string, newName: string): Promise<MutationResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("media_types").update({ name: newName }).eq("name", oldName);
  return { error: error ? "other" : null };
}

export async function deleteMediaType(name: string): Promise<DeleteResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("media_types").delete().eq("name", name);
  if (!error) return { error: null };
  return { error: isForeignKeyViolation(error) ? "in_use" : "other" };
}

export async function createEditie(name: string): Promise<MutationResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { count } = await supabase.from("edities").select("*", { count: "exact", head: true });
  const { error } = await supabase.from("edities").insert({ name, sort_order: count ?? 0 });
  return { error: error ? "other" : null };
}

export async function renameEditie(oldName: string, newName: string): Promise<MutationResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("edities").update({ name: newName }).eq("name", oldName);
  return { error: error ? "other" : null };
}

export async function deleteEditie(name: string): Promise<DeleteResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("edities").delete().eq("name", name);
  if (!error) return { error: null };
  return { error: isForeignKeyViolation(error) ? "in_use" : "other" };
}
