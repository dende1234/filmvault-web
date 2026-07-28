import { getOrCreateProfile } from "@/actions/profile";
import { ProfileForm } from "@/components/profile-form";

export default async function ProfilePage() {
  const profile = await getOrCreateProfile();
  if (!profile) return null;
  return (
    <div className="mx-auto max-w-2xl">
      <ProfileForm profile={profile} />
    </div>
  );
}
