import { getFeedPosts, markPostsSeen } from "@/actions/posts";
import { getPublicProfiles } from "@/actions/friends";
import { FeedPageClient } from "@/components/feed-page-client";
import type { FeedPostUiItem } from "@/types/database";

export default async function FeedPage() {
  const { posts, seenPostIds } = await getFeedPosts();
  const seenSet = new Set(seenPostIds);
  const authorIds = Array.from(new Set(posts.map((p) => p.author_id)));
  const authors = await getPublicProfiles(authorIds);
  const authorsById = new Map(authors.map((a) => [a.id, a]));

  const items: FeedPostUiItem[] = posts.map((post) => {
    const author = authorsById.get(post.author_id);
    return {
      post,
      authorName: author?.name ?? null,
      authorAvatarUrl: author?.avatar_url ?? null,
      isSeen: seenSet.has(post.id),
    };
  });

  // Only marks posts that were NOT yet seen at this load — seen_posts has a
  // unique (viewer_id, post_id) constraint, so re-inserting an already-seen
  // post would fail. Already-seen posts stay visible under the "Eerder
  // gezien" divider (FeedPageClient) rather than disappearing outright.
  const notYetSeenIds = posts.filter((p) => !seenSet.has(p.id)).map((p) => p.id);
  await markPostsSeen(notYetSeenIds);

  return (
    <div className="mx-auto max-w-2xl">
      <FeedPageClient items={items} />
    </div>
  );
}
