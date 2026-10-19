import { getOrCreateProfile } from "@/actions/profile";
import { getNewFeedbackCount } from "@/actions/feedback";
import { getUnreadNotificationCount } from "@/actions/notifications";
import { NavShell } from "@/components/nav-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getOrCreateProfile();
  const [feedbackNewCount, unreadNotifications] = await Promise.all([
    profile?.is_admin ? getNewFeedbackCount() : Promise.resolve(0),
    profile ? getUnreadNotificationCount() : Promise.resolve(0),
  ]);
  return (
    <NavShell profile={profile} feedbackNewCount={feedbackNewCount} unreadNotifications={unreadNotifications}>
      {children}
    </NavShell>
  );
}
