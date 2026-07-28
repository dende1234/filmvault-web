import { getFeedPosts, markPostsSeen } from "@/actions/posts";
import { getPublicProfiles } from "@/actions/friends";
import { FeedPageClient } from "@/components/feed-page-client";
import type { FeedPostUiItem } from "@/types/database";

export default async function FeedPage() {
  const posts = await getFeedPosts();
  const authorIds = Array.from(new Set(posts.map((p) => p.author_id)));
  const authors = await getPublicProfiles(authorIds);
  const authorsById = new Map(authors.map((a) => [a.id, a]));

  const items: FeedPostUiItem[] = posts.map((post) => {
    const author = authorsById.get(post.author_id);
    return { post, authorName: author?.name ?? null, authorAvatarUrl: author?.avatar_url ?? null };
  });

  // Marks every loaded post as seen right after displaying it — the feed
  // behaves like a notification tray that clears on open, not a scrollable
  // history (that's what a user's public profile "wall" is for).
  await markPostsSeen(posts.map((p) => p.id));

  return (
    <div className="mx-auto max-w-2xl">
      <FeedPageClient items={items} />
    </div>
  );
}
