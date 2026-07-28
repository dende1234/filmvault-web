import { notFound } from "next/navigation";
import { getOrCreateProfile, getPublicProfileDetails } from "@/actions/profile";
import { getFollowerCount, getFollowingCount, isFollowing } from "@/actions/follows";
import { getPublicBadges } from "@/actions/badges";
import { getPostsByAuthor } from "@/actions/posts";
import { PublicProfileClient } from "@/components/public-profile-client";

export default async function PublicProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const currentProfile = await getOrCreateProfile();
  const isOwnProfile = currentProfile?.id === userId;

  const profile = await getPublicProfileDetails(userId);
  if (!profile) notFound();

  const [followerCount, followingCount, following, badges, posts] = await Promise.all([
    getFollowerCount(userId),
    getFollowingCount(userId),
    isOwnProfile ? Promise.resolve(false) : isFollowing(userId),
    getPublicBadges(userId),
    getPostsByAuthor(userId),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <PublicProfileClient
        profile={profile}
        followerCount={followerCount}
        followingCount={followingCount}
        isFollowing={following}
        isOwnProfile={isOwnProfile}
        earnedBadgeIds={badges.map((b) => b.badge_id)}
        posts={posts}
      />
    </div>
  );
}
