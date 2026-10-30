import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";

/** "Download all my data" (GDPR art. 15/20): everything stored about the
 * signed-in member as one JSON file. Uses their own session, so RLS limits
 * every query to their rows; a table that does not exist yet is skipped. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const { data: collections } = await supabase.from("collections").select("*").eq("user_id", user.id).order("id");
  const collectionIds = (collections ?? []).map((c: { id: string }) => c.id);

  const owned = async (table: string, column = "user_id") => {
    try {
      return await fetchAll((from, to) =>
        supabase.from(table).select("*").eq(column, user.id).order("id").range(from, to),
      );
    } catch {
      return null;
    }
  };

  const items = collectionIds.length
    ? await fetchAll((from, to) =>
        supabase.from("collection_items").select("*").in("collection_id", collectionIds).order("id").range(from, to),
      ).catch(() => null)
    : [];

  const data = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at },
    profile,
    collections,
    collection_items: items,
    wishlist: await owned("wishlist_items"),
    film_logs: await owned("film_logs"),
    film_viewings: await owned("film_viewings"),
    smart_collections: await owned("smart_collections"),
    notifications: await owned("user_notifications"),
    feedback: await owned("user_feedback"),
    friend_requests_sent: await owned("friend_requests", "sender_id"),
    posts: await owned("posts", "author_id"),
    post_comments: await owned("post_comments", "author_id"),
    barcode_submissions: await owned("pending_barcodes", "submitted_by"),
  };

  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="filmory-data-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
