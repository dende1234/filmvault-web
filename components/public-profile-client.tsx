"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Award, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { Avatar } from "@/components/avatar";
import { EmptyState } from "@/components/empty-state";
import { follow, unfollow } from "@/actions/follows";
import type { Post, PublicProfile } from "@/types/database";
import { BADGE_IDS } from "@/types/database";
import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";

export function PublicProfileClient({
  profile,
  followerCount: initialFollowerCount,
  followingCount,
  isFollowing: initialIsFollowing,
  isOwnProfile,
  earnedBadgeIds,
  posts,
}: {
  profile: PublicProfile;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isOwnProfile: boolean;
  earnedBadgeIds: string[];
  posts: Post[];
}) {
  const { t } = useT();
  const router = useRouter();
  const [isFollowingState, setIsFollowingState] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [isProcessing, setIsProcessing] = useState(false);
  const earnedBadges = BADGE_IDS.filter((b) => earnedBadgeIds.includes(b.id));
  const locationAndWebsite = [profile.location, profile.website].filter(Boolean).join(" · ");

  async function toggleFollow() {
    setIsProcessing(true);
    try {
      if (isFollowingState) {
        await unfollow(profile.id);
        setFollowerCount((c) => c - 1);
      } else {
        await follow(profile.id);
        setFollowerCount((c) => c + 1);
      }
      setIsFollowingState(!isFollowingState);
      router.refresh();
    } catch {
      toast.error(t("public_profile_error_follow"));
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Avatar src={profile.avatar_url} name={profile.name} className="size-24 text-2xl ring-2 ring-primary/40" />
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{profile.name || t("friends_unnamed_user")}</h1>
      <p className="text-sm text-muted-foreground">{t("public_profile_follow_counts", followerCount, followingCount)}</p>

      {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}
      {locationAndWebsite && <p className="text-xs text-muted-foreground">{locationAndWebsite}</p>}

      {!isOwnProfile && (
        <Button variant={isFollowingState ? "secondary" : "default"} className="mt-3" disabled={isProcessing} onClick={toggleFollow}>
          {isFollowingState ? t("public_profile_unfollow_button") : t("public_profile_follow_button")}
        </Button>
      )}

      {earnedBadges.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {earnedBadges.map((badge) => (
            <span
              key={badge.id}
              title={t(badge.titleKey)}
              className="flex size-10 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/40"
            >
              <Award className="size-5 text-primary" aria-label={t(badge.titleKey)} />
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 w-full text-left">
        <h2 className="mb-3 font-display text-xl font-semibold tracking-tight">{t("public_profile_posts_title")}</h2>
        {posts.length === 0 ? (
          <EmptyState icon={MessageSquare} title={t("public_profile_posts_empty")} />
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} ratingStarPrefix={t("rating_star_prefix")} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
