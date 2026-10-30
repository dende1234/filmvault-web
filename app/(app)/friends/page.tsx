import { getFriends, getIncomingRequests, getOutgoingRequests } from "@/actions/friends";
import { getFollowingIds } from "@/actions/follows";
import { getMyInviteCount } from "@/actions/badges";
import { createClient } from "@/lib/supabase/server";
import { FriendsPageClient } from "@/components/friends-page-client";
import { SITE_URL } from "@/lib/site";

export default async function FriendsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [friends, incoming, outgoing, followingIds, inviteCount] = await Promise.all([
    getFriends(),
    getIncomingRequests(),
    getOutgoingRequests(),
    user ? getFollowingIds(user.id) : Promise.resolve([]),
    getMyInviteCount(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <FriendsPageClient
        friends={friends}
        incoming={incoming}
        outgoing={outgoing}
        followingIds={followingIds}
        inviteUrl={`${SITE_URL}/?ref=invite-${(user?.id ?? "").slice(0, 8)}`}
        inviteCount={inviteCount}
      />
    </div>
  );
}
