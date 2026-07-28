"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  rejectFriendRequest,
  searchProfiles,
  sendFriendRequest,
} from "@/actions/friends";
import { follow, unfollow } from "@/actions/follows";
import type { FriendRequestWithProfile, ProfileSearchResult } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function conflictMessage(t: (key: "friends_already_friends" | "friends_request_already_pending" | "friends_error_send") => string, error: unknown) {
  if (error instanceof Error && error.message === "already_friends") return t("friends_already_friends");
  if (error instanceof Error && error.message === "already_pending") return t("friends_request_already_pending");
  return t("friends_error_send");
}

function PersonRow({ profile }: { profile: ProfileSearchResult }) {
  const { t } = useT();
  return (
    <Card className="hover:bg-muted">
      <div className="flex items-center gap-3 p-3">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-muted" />
        )}
        <span className="font-medium">{profile.name || t("friends_unnamed_user")}</span>
      </div>
    </Card>
  );
}

export function FriendsPageClient({
  friends,
  incoming,
  outgoing,
  followingIds,
}: {
  friends: ProfileSearchResult[];
  incoming: FriendRequestWithProfile[];
  outgoing: FriendRequestWithProfile[];
  followingIds: string[];
}) {
  const { t } = useT();
  const router = useRouter();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchInfo, setSearchInfo] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [following, setFollowing] = useState<Set<string>>(new Set(followingIds));
  const [processingFollowIds, setProcessingFollowIds] = useState<Set<string>>(new Set());

  function withProcessing(id: string, fn: () => Promise<void>) {
    setProcessingIds((prev) => new Set(prev).add(id));
    fn().finally(() => {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      router.refresh();
    });
  }

  async function handleSearch() {
    if (!query.trim()) return;
    setIsSearching(true);
    setSearchInfo(null);
    try {
      const found = await searchProfiles(query);
      setResults(found);
      if (found.length === 0) setSearchInfo(t("friends_no_users_found"));
    } catch {
      setSearchInfo(t("friends_error_search"));
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSendRequest(profile: ProfileSearchResult) {
    setProcessingIds((prev) => new Set(prev).add(profile.id));
    try {
      await sendFriendRequest(profile.id);
      setSearchInfo(t("friends_request_sent", profile.name ?? ""));
      router.refresh();
    } catch (error) {
      setSearchInfo(conflictMessage(t, error));
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(profile.id);
        return next;
      });
    }
  }

  async function toggleFollow(profile: ProfileSearchResult) {
    const wasFollowing = following.has(profile.id);
    setProcessingFollowIds((prev) => new Set(prev).add(profile.id));
    try {
      if (wasFollowing) await unfollow(profile.id);
      else await follow(profile.id);
      setFollowing((prev) => {
        const next = new Set(prev);
        if (wasFollowing) next.delete(profile.id);
        else next.add(profile.id);
        return next;
      });
    } catch {
      setSearchInfo(t("friends_error_follow"));
    } finally {
      setProcessingFollowIds((prev) => {
        const next = new Set(prev);
        next.delete(profile.id);
        return next;
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("nav_friends")}</h1>
        <Button onClick={() => setShowAddDialog(true)}>
          <UserPlus className="h-4 w-4" />
          {t("friends_add_title")}
        </Button>
      </div>

      {incoming.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold">{t("friends_incoming_title")}</h2>
          {incoming.map((item) => (
            <Card key={item.request.id}>
              <CardContent className="flex items-center justify-between gap-3 pt-5">
                <div className="flex items-center gap-3">
                  {item.otherProfile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.otherProfile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted" />
                  )}
                  <span className="font-medium">{item.otherProfile.name || t("friends_unnamed_user")}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={processingIds.has(item.request.id)}
                    onClick={() => withProcessing(item.request.id, () => acceptFriendRequest(item.request.id))}
                  >
                    {t("action_accept")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={processingIds.has(item.request.id)}
                    onClick={() => withProcessing(item.request.id, () => rejectFriendRequest(item.request.id))}
                  >
                    {t("action_reject")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold">{t("friends_outgoing_title")}</h2>
          {outgoing.map((item) => (
            <Card key={item.request.id}>
              <CardContent className="flex items-center justify-between gap-3 pt-5">
                <div className="flex items-center gap-3">
                  {item.otherProfile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.otherProfile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted" />
                  )}
                  <span className="font-medium">{item.otherProfile.name || t("friends_unnamed_user")}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={processingIds.has(item.request.id)}
                  onClick={() => withProcessing(item.request.id, () => cancelFriendRequest(item.request.id))}
                >
                  {t("action_cancel")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold">{t("friends_my_friends_title")}</h2>
        {friends.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("friends_empty")}</p>
        ) : (
          friends.map((friend) => (
            <Link key={friend.id} href={`/friends/${friend.id}`}>
              <PersonRow profile={friend} />
            </Link>
          ))
        )}
      </section>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t("friends_add_title")}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
            <Button onClick={handleSearch} disabled={isSearching}>
              {t("friends_search_button")}
            </Button>
          </div>
          {searchInfo && <p className="text-sm text-muted-foreground">{searchInfo}</p>}
          <div className="flex-1 overflow-y-auto">
            {results.map((profile) => (
              <div key={profile.id} className="flex items-center justify-between gap-3 p-2">
                <div className="flex items-center gap-3">
                  {profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-muted" />
                  )}
                  <span className="text-sm font-medium">{profile.name || t("friends_unnamed_user")}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={processingFollowIds.has(profile.id)}
                    onClick={() => toggleFollow(profile)}
                  >
                    {following.has(profile.id) ? t("friends_unfollow_button") : t("friends_follow_button")}
                  </Button>
                  <Button size="sm" disabled={processingIds.has(profile.id)} onClick={() => handleSendRequest(profile)}>
                    {t("friends_add_title")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" onClick={() => setShowAddDialog(false)}>
            {t("friends_close_button")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
