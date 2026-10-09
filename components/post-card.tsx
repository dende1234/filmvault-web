import Link from "next/link";
import { Star } from "lucide-react";
import { format } from "@/lib/i18n/dictionary";
import { Poster } from "@/components/movie/poster";
import type { Post } from "@/types/database";

/** Shared post card used by both the Feed and a user's public profile "wall"
 * — mirrors social/PostRow.kt. The author name is deliberately NOT rendered
 * inside here (Android renders it as a separate clickable element above the
 * card, since the card itself navigates to the post and a name-click
 * navigates to the author's profile instead — nesting both in one link
 * isn't valid HTML anyway). */
export function PostCard({ post, ratingStarPrefix }: { post: Post; ratingStarPrefix: string }) {
  return (
    <Link
      href={`/feed/${post.id}`}
      className="group flex gap-4 rounded-card border border-border/70 bg-card p-4 transition-colors hover:border-primary/40 hover:bg-elevated/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {post.tmdb_movie_id && (
        <Poster path={post.movie_poster} title={post.movie_title ?? ""} size="xs" className="w-16 shrink-0 sm:w-20" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {post.movie_title && (
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{post.movie_title}</p>
        )}
        {post.title && <p className="font-display text-lg font-semibold leading-tight tracking-tight">{post.title}</p>}
        {post.rating != null && (
          <p className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            <Star className="size-3.5 fill-current" aria-hidden />
            <span className="sr-only">{format(ratingStarPrefix, post.rating)}</span>
            <span aria-hidden>{post.rating}</span>
          </p>
        )}
        <p className="line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-foreground/85">{post.body}</p>
      </div>
    </Link>
  );
}
