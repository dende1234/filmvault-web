"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Award, User } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
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
      {profile.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatar_url} alt={profile.name ?? ""} className="h-24 w-24 rounded-full object-cover" />
      ) : (
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
          <User className="h-10 w-10 text-muted-foreground" />
        </div>
      )}
      <h1 className="mt-2 text-xl font-semibold">{profile.name || t("friends_unnamed_user")}</h1>
      <p className="text-sm text-muted-foreground">{t("public_profile_follow_counts", followerCount, followingCount)}</p>

      {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}
      {locationAndWebsite && <p className="text-xs text-muted-foreground">{locationAndWebsite}</p>}

      {!isOwnProfile && (
        <Button variant="outline" className="mt-3" disabled={isProcessing} onClick={toggleFollow}>
          {isFollowingState ? t("public_profile_unfollow_button") : t("public_profile_follow_button")}
        </Button>
      )}

      {earnedBadges.length > 0 && (
        <div className="mt-4 flex gap-1">
          {earnedBadges.map((badge) => (
            <Award key={badge.id} className="h-7 w-7 text-primary" aria-label={t(badge.titleKey)} />
          ))}
        </div>
      )}

      <div className="mt-6 w-full text-left">
        <h2 className="mb-2 text-base font-semibold">{t("public_profile_posts_title")}</h2>
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("public_profile_posts_empty")}</p>
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
