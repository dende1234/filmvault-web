import Link from "next/link";
import Image from "next/image";
import { format } from "@/lib/i18n/dictionary";
import { posterUrl } from "@/types/tmdb";
import type { Post } from "@/types/database";
import { Card } from "@/components/ui/card";

/** Shared post card used by both the Feed and a user's public profile "wall"
 * — mirrors social/PostRow.kt. The author name is deliberately NOT rendered
 * inside here (Android renders it as a separate clickable element above the
 * card, since the card itself navigates to the post and a name-click
 * navigates to the author's profile instead — nesting both in one link
 * isn't valid HTML anyway). */
export function PostCard({ post, ratingStarPrefix }: { post: Post; ratingStarPrefix: string }) {
  const poster = posterUrl(post.movie_poster, "w200");
  return (
    <Link href={`/feed/${post.id}`}>
      <Card className="p-4 hover:bg-muted">
        {post.title && <p className="mt-1 font-medium">{post.title}</p>}
        <p className="mt-1 whitespace-pre-line text-sm">{post.body}</p>
        {post.tmdb_movie_id && (
          <div className="mt-3 flex items-center gap-3">
            <div className="relative h-[75px] w-[50px] flex-none overflow-hidden rounded-md bg-muted">
              {poster && <Image src={poster} alt={post.movie_title ?? ""} fill className="object-cover" />}
            </div>
            <div>
              {post.movie_title && <p className="text-sm">{post.movie_title}</p>}
              {post.rating != null && (
                <p className="text-xs text-muted-foreground">{format(ratingStarPrefix, post.rating)}</p>
              )}
            </div>
          </div>
        )}
      </Card>
    </Link>
  );
}
