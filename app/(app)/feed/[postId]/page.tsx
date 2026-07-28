import { notFound } from "next/navigation";
import { getComments, getPost } from "@/actions/posts";
import { getPublicProfiles } from "@/actions/friends";
import { getOrCreateProfile } from "@/actions/profile";
import { PostDetailClient } from "@/components/post-detail-client";

export default async function PostDetailPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const currentProfile = await getOrCreateProfile();

  const [post, comments] = await Promise.all([getPost(postId), getComments(postId)]);
  if (!post) notFound();

  const authorIds = Array.from(new Set([post.author_id, ...comments.map((c) => c.author_id)]));
  const profiles = await getPublicProfiles(authorIds);
  const profilesById = new Map(profiles.map((p) => [p.id, p]));

  return (
    <div className="mx-auto max-w-2xl">
      <PostDetailClient
        post={post}
        authorName={profilesById.get(post.author_id)?.name ?? null}
        comments={comments.map((c) => ({ comment: c, authorName: profilesById.get(c.author_id)?.name ?? null }))}
        currentUserId={currentProfile?.id ?? null}
        isAdmin={currentProfile?.is_admin === true}
      />
    </div>
  );
}
