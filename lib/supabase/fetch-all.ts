/** PostgREST returns at most 1000 rows per request (Supabase's default
 * max-rows), so a plain select silently cuts off big collections. Pages
 * through until a short page; pass a stable .order() in the query so pages
 * don't overlap. */
export const PAGE_SIZE = 1000;

export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>,
  limit = Infinity,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < limit; from += PAGE_SIZE) {
    const { data, error } = await page(from, Math.min(from + PAGE_SIZE, limit) - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}
