"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/locale-provider";
import { createPost } from "@/actions/posts";
import type { FeedPostUiItem } from "@/types/database";
import type { MovieSummaryDto } from "@/types/tmdb";
import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { StarRating } from "@/components/ui/star-rating";
import { MovieSearchPickerDialog } from "@/components/movie-search-picker-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export function FeedPageClient({ items }: { items: FeedPostUiItem[] }) {
  const { t } = useT();
  const router = useRouter();
  const [showNewPost, setShowNewPost] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [movie, setMovie] = useState<MovieSummaryDto | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = body.trim().length > 0 && !isPosting;
  const newItems = items.filter((item) => !item.isSeen);
  const seenItems = items.filter((item) => item.isSeen);

  function reset() {
    setTitle("");
    setBody("");
    setMovie(null);
    setRating(0);
    setError(null);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsPosting(true);
    setError(null);
    try {
      await createPost(
        title.trim() || null,
        body.trim(),
        movie?.id ?? null,
        movie?.title ?? null,
        movie?.poster_path ?? null,
        movie ? (rating > 0 ? rating : null) : null,
      );
      setShowNewPost(false);
      reset();
      router.refresh();
    } catch {
      setError(t("feed_error_post"));
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("nav_feed")}</h1>
        <Button onClick={() => setShowNewPost(true)}>{t("feed_new_post_title")}</Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("feed_empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {newItems.map((item) => (
            <FeedPostItem key={item.post.id} item={item} />
          ))}
          {seenItems.length > 0 && (
            <div className="my-2 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("feed_seen_divider")}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}
          {seenItems.map((item) => (
            <FeedPostItem key={item.post.id} item={item} />
          ))}
        </div>
      )}

      <Dialog
        open={showNewPost}
        onOpenChange={(open) => {
          setShowNewPost(open);
          if (!open) reset();
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("feed_new_post_title")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input placeholder={t("feed_post_title_label")} value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea placeholder={t("feed_post_body_label")} value={body} onChange={(e) => setBody(e.target.value)} />

            {movie ? (
              <div className="flex items-center justify-between rounded-lg border border-border p-2">
                <span className="text-sm font-medium">{movie.title}</span>
                <button className="text-sm text-muted-foreground" onClick={() => setMovie(null)}>
                  ✕
                </button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setPickerOpen(true)}>
                {t("feed_link_movie_button")}
              </Button>
            )}
            {movie && <StarRating value={rating} onChange={setRating} />}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPost(false)}>
              {t("action_cancel")}
            </Button>
            <Button disabled={!canSubmit} onClick={handleSubmit}>
              {t("feed_post_submit_button")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MovieSearchPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onSelect={(m) => { setMovie(m); setPickerOpen(false); }} />
    </div>
  );
}

function FeedPostItem({ item }: { item: FeedPostUiItem }) {
  const { t } = useT();
  return (
    <div className="flex flex-col gap-1">
      {item.authorName && (
        <Link href={`/u/${item.post.author_id}`} className="w-fit text-sm font-semibold hover:underline">
          {item.authorName}
        </Link>
      )}
      <PostCard post={item.post} ratingStarPrefix={t("rating_star_prefix")} />
    </div>
  );
}
