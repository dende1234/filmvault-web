import { getAllProfiles } from "@/actions/admin";
import { createClient } from "@/lib/supabase/server";
import { AdminUsersClient } from "@/components/admin/admin-users-client";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profiles = await getAllProfiles();

  return (
    <div className="mx-auto max-w-3xl">
      <AdminUsersClient profiles={profiles} currentUserId={user?.id ?? null} />
    </div>
  );
}
