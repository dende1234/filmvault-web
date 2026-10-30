import { createClient } from "@/lib/supabase/server";

/** The signed-in user's id, or throws — for Server Actions that only make
 * sense for a logged-in user (RLS still decides what they may touch). */
export async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");
  return user.id;
}
