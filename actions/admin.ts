"use server";

// Direct port of admin/AdminRepository.kt — same table/RPC/Edge-Function
// names. requireAdmin() re-checks admin status server-side on every call,
// same "reachable via deep link, don't just trust the caller" reasoning as
// every Android admin ViewModel's load().

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import { adminRegisterBarcode } from "@/actions/collections";
import { getMovieDetail } from "@/lib/tmdb/server";
import { BarcodeAlreadyRegisteredError } from "@/lib/errors";
import { getLocale } from "@/lib/preferences";
import type { AdminProfile, AdminStats } from "@/types/database";

export async function getAllProfiles(): Promise<AdminProfile[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("id, name, email, avatar_url, is_admin, created_at");
  if (error) throw error;
  return data as AdminProfile[];
}

export async function setUserAdminStatus(targetUserId: string, isAdmin: boolean): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_user_admin_status", {
    target_user_id: targetUserId,
    new_is_admin: isAdmin,
  });
  if (error) throw error;
  revalidatePath("/admin/users");
}

export async function getAppStats(): Promise<AdminStats> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_get_app_stats");
  if (error) throw error;
  return (data as AdminStats[])[0];
}

export async function sendAnnouncement(title: string, body: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.functions.invoke("send-announcement", { body: { title, body } });
  if (error) throw error;
}

/** Deletes ANOTHER user's account and all their data — via a separate
 * admin-delete-user Edge Function, not the self-service delete-account
 * one used by actions/profile.ts's deleteAccount(), since that one trusts
 * the caller's own JWT alone. */
export async function deleteUserAccount(targetUserId: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.functions.invoke("admin-delete-user", { body: { target_user_id: targetUserId } });
  if (error) throw error;
  revalidatePath("/admin/users");
}

/** Wraps adminRegisterBarcode so the client doesn't need to import
 * lib/tmdb/server.ts directly (it's marked "server-only") just to resolve
 * the conflicting film's title for the duplicate-barcode error message. */
export async function adminRegisterBarcodeWithConflictTitle(
  tmdbMovieId: number,
  barcode: string,
  type: string,
  editie: string,
): Promise<{ error: "duplicate"; conflictTitle: string } | { error: "other" } | { error: null }> {
  try {
    await adminRegisterBarcode(tmdbMovieId, barcode, type, editie);
    return { error: null };
  } catch (e) {
    if (e instanceof BarcodeAlreadyRegisteredError) {
      const locale = await getLocale();
      const conflictTitle = await getMovieDetail(e.existingTmdbMovieId, locale)
        .then((m) => m.title)
        .catch(() => "");
      return { error: "duplicate", conflictTitle };
    }
    return { error: "other" };
  }
}
