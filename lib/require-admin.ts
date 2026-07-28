import { createClient } from "@/lib/supabase/server";

/** Every Android admin ViewModel re-checks `profile.isAdmin` at load() time,
 * since these screens are reachable via deep link, not just the admin-gated
 * drawer item — same defense-in-depth here, called from every /admin/* page
 * AND from the mutating actions themselves (a page-level check alone would
 * only gate the UI, not the actual writes). */
export async function requireAdmin(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) throw new Error("not_admin");
  return user.id;
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    await requireAdmin();
    return true;
  } catch {
    return false;
  }
}
