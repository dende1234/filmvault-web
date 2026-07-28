import { getFriends, getIncomingRequests, getOutgoingRequests } from "@/actions/friends";
import { getFollowingIds } from "@/actions/follows";
import { createClient } from "@/lib/supabase/server";
import { FriendsPageClient } from "@/components/friends-page-client";

export default async function FriendsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [friends, incoming, outgoing, followingIds] = await Promise.all([
    getFriends(),
    getIncomingRequests(),
    getOutgoingRequests(),
    user ? getFollowingIds(user.id) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <FriendsPageClient friends={friends} incoming={incoming} outgoing={outgoing} followingIds={followingIds} />
    </div>
  );
}
