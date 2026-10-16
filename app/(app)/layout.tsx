import { getOrCreateProfile } from "@/actions/profile";
import { getNewFeedbackCount } from "@/actions/feedback";
import { NavShell } from "@/components/nav-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getOrCreateProfile();
  const feedbackNewCount = profile?.is_admin ? await getNewFeedbackCount() : 0;
  return (
    <NavShell profile={profile} feedbackNewCount={feedbackNewCount}>
      {children}
    </NavShell>
  );
}
