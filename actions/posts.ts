"use server";

// Direct port of social/PostRepository.kt — posts are NOT public like
// curated_lists; posts_select_own_or_following gates reads to the author or
// their followers (social_feed.sql).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getFollowingIds } from "@/actions/follows";
import type { Post, PostComment } from "@/types/database";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");
  return user.id;
}

export async function createPost(
  title: string | null,
  body: string,
  tmdbMovieId: number | null,
  movieTitle: string | null,
  moviePoster: string | null,
  rating: number | null,
): Promise<Post> {
  const supabase = await createClient();
  const authorId = await requireUserId();
  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: authorId,
      title,
      body,
      tmdb_movie_id: tmdbMovieId,
      movie_title: movieTitle,
      movie_poster: moviePoster,
      rating,
    })
    .select("*")
    .single();
  if (error) throw error;
  revalidatePath("/feed");
  return data as Post;
}

export async function deletePost(postId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw error;
  revalidatePath("/feed");
}

export async function getPost(postId: string): Promise<Post | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("posts").select("*").eq("id", postId).maybeSingle();
  return data as Post | null;
}

/** A user's own posts, newest first — their public "wall", still visible
 * here even after a viewer has marked them seen in their feed (feed
 * exclusion is per-viewer, not global). Empty for a non-follower, since RLS
 * gates posts behind the follow relationship — same as Android. */
export async function getPostsByAuthor(authorId: string): Promise<Post[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("posts").select("*").eq("author_id", authorId);
  if (error) throw error;
  return (data as Post[]).sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
}

/** Posts from followed authors that this viewer hasn't seen yet, newest first. */
export async function getFeedPosts(): Promise<Post[]> {
  const supabase = await createClient();
  const viewerId = await requireUserId();
  const followingIds = await getFollowingIds(viewerId);
  if (followingIds.length === 0) return [];

  const { data: postsData, error } = await supabase.from("posts").select("*").in("author_id", followingIds);
  if (error) throw error;
  const posts = postsData as Post[];
  if (posts.length === 0) return [];

  const { data: seenData, error: seenError } = await supabase
    .from("seen_posts")
    .select("post_id")
    .eq("viewer_id", viewerId)
    .in(
      "post_id",
      posts.map((p) => p.id),
    );
  if (seenError) throw seenError;
  const seenIds = new Set((seenData as { post_id: string }[]).map((r) => r.post_id));

  return posts
    .filter((p) => !seenIds.has(p.id))
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
}

export async function markPostsSeen(postIds: string[]): Promise<void> {
  if (postIds.length === 0) return;
  const supabase = await createClient();
  const viewerId = await requireUserId();
  const { error } = await supabase
    .from("seen_posts")
    .insert(postIds.map((postId) => ({ viewer_id: viewerId, post_id: postId })));
  if (error) throw error;
}

/** A single comment by id — used to resolve which post a reported comment
 * belongs to, since a comment has no detail screen of its own (used again
 * once Fase 5's report moderation queue is built). */
export async function getComment(commentId: string): Promise<PostComment | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("post_comments").select("*").eq("id", commentId).maybeSingle();
  return data as PostComment | null;
}

export async function getComments(postId: string): Promise<PostComment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("post_comments").select("*").eq("post_id", postId);
  if (error) throw error;
  return (data as PostComment[]).sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
}

export async function addComment(postId: string, body: string): Promise<PostComment> {
  const supabase = await createClient();
  const authorId = await requireUserId();
  const { data, error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, author_id: authorId, body })
    .select("*")
    .single();
  if (error) throw error;
  revalidatePath(`/feed/${postId}`);
  return data as PostComment;
}

export async function deleteComment(commentId: string, postId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("post_comments").delete().eq("id", commentId);
  if (error) throw error;
  revalidatePath(`/feed/${postId}`);
}
