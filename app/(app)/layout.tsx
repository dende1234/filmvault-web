import { getOrCreateProfile } from "@/actions/profile";
import { getNewFeedbackCount } from "@/actions/feedback";
import { getUnreadNotificationCount } from "@/actions/notifications";
import { createClient } from "@/lib/supabase/server";
import { NavShell } from "@/components/nav-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getOrCreateProfile();
  const [feedbackNewCount, unreadNotifications] = await Promise.all([
    profile?.is_admin ? getNewFeedbackCount() : Promise.resolve(0),
    profile ? getUnreadNotificationCount() : Promise.resolve(0),
  ]);
  const supabase = await createClient();
  const { data: firstCopy } = profile ? await supabase.from("collection_items")
    .select("id, collections!inner(user_id)").eq("collections.user_id", profile.id).limit(1) : { data: [] };
  return (
    <NavShell beginner={!firstCopy?.length} profile={profile} feedbackNewCount={feedbackNewCount} unreadNotifications={unreadNotifications}>
      {children}
    </NavShell>
  );
}
