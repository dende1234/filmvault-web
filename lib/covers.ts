/** Custom covers live in the public Supabase Storage bucket "covers"
 * (custom_covers.sql), at {user_id}/{uuid}.jpg. */
export const COVERS_BUCKET = "covers";

export function coverUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  return base ? `${base}/storage/v1/object/public/${COVERS_BUCKET}/${path}` : null;
}
