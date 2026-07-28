"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { addComment, deleteComment, deletePost } from "@/actions/posts";
import type { Post, PostComment } from "@/types/database";
import { posterUrl } from "@/types/tmdb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ReportDialog } from "@/components/report-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function PostDetailClient({
  post,
  authorName,
  comments,
  currentUserId,
  isAdmin = false,
}: {
  post: Post;
  authorName: string | null;
  comments: { comment: PostComment; authorName: string | null }[];
  currentUserId: string | null;
  isAdmin?: boolean;
}) {
  const { t } = useT();
  const router = useRouter();
  const isOwnPost = post.author_id === currentUserId;
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReportPostDialog, setShowReportPostDialog] = useState(false);
  const [commentPendingReport, setCommentPendingReport] = useState<string | null>(null);
  const poster = posterUrl(post.movie_poster, "w200");

  async function handleAddComment() {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    try {
      await addComment(post.id, trimmed);
      setCommentText("");
      router.refresh();
    } catch {
      toast.error(t("post_detail_error_comment"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    try {
      await deleteComment(commentId, post.id);
      router.refresh();
    } catch {
      toast.error(t("post_detail_error_comment"));
    }
  }

  async function handleDeletePost() {
    setIsDeleting(true);
    try {
      await deletePost(post.id);
      router.replace("/feed");
      router.refresh();
    } catch {
      toast.error(t("post_detail_error_delete"));
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-5">
        {authorName && <p className="text-sm font-semibold">{authorName}</p>}
        {post.title && <p className="mt-1 text-lg font-medium">{post.title}</p>}
        <p className="mt-1 whitespace-pre-line">{post.body}</p>
        {post.tmdb_movie_id && (
          <div className="mt-4 flex items-center gap-3">
            <div className="relative h-[90px] w-[60px] flex-none overflow-hidden rounded-md bg-muted">
              {poster && <Image src={poster} alt={post.movie_title ?? ""} fill className="object-cover" />}
            </div>
            <div>
              {post.movie_title && <p className="text-sm font-medium">{post.movie_title}</p>}
              {post.rating != null && (
                <p className="text-xs text-muted-foreground">{t("rating_star_prefix", post.rating)}</p>
              )}
            </div>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          {(isOwnPost || isAdmin) && (
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
              {t("post_detail_delete_button")}
            </Button>
          )}
          {!isOwnPost && (
            <Button variant="outline" size="sm" onClick={() => setShowReportPostDialog(true)}>
              {t("action_report")}
            </Button>
          )}
        </div>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-bold">{t("post_detail_comments_title", comments.length)}</h2>
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("post_detail_comments_empty")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {comments.map(({ comment, authorName: commentAuthor }) => {
              const isOwnComment = comment.author_id === currentUserId;
              return (
                <Card key={comment.id} className="flex items-start justify-between gap-3 p-3">
                  <div>
                    {commentAuthor && <p className="text-xs font-semibold">{commentAuthor}</p>}
                    <p className="text-sm">{comment.body}</p>
                  </div>
                  <div className="flex gap-2">
                    {!isOwnComment && (
                      <button
                        onClick={() => setCommentPendingReport(comment.id)}
                        className="text-xs text-muted-foreground hover:text-primary"
                      >
                        {t("action_report")}
                      </button>
                    )}
                    {(isOwnComment || isAdmin) && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        {t("action_delete")}
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <Input
            placeholder={t("post_detail_comment_label")}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
          />
          <Button onClick={handleAddComment} disabled={isSubmitting || !commentText.trim()}>
            {t("action_send")}
          </Button>
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("post_detail_delete_button")}</DialogTitle>
            <DialogDescription>{t("post_detail_delete_confirm_text")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              {t("action_cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeletePost} disabled={isDeleting}>
              {t("action_delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReportDialog open={showReportPostDialog} onOpenChange={setShowReportPostDialog} contentType="post" contentId={post.id} />
      <ReportDialog
        open={!!commentPendingReport}
        onOpenChange={(open) => !open && setCommentPendingReport(null)}
        contentType="comment"
        contentId={commentPendingReport ?? ""}
      />
    </div>
  );
}
