import { getOrCreateProfile } from "@/actions/profile";
import { NavShell } from "@/components/nav-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getOrCreateProfile();
  return <NavShell profile={profile}>{children}</NavShell>;
}
