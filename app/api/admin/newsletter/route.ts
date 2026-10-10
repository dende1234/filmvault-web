import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";

function csvCell(value: string | null | undefined) {
  const v = value ?? "";
  return /[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** CSV of members who opted in to the newsletter (admin only), for import
 * into a mailing tool. Only consenting members, only what's needed. */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return new Response("Forbidden", { status: 403 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("email, name, newsletter_opt_in_at")
    .eq("newsletter_opt_in", true)
    .order("newsletter_opt_in_at", { ascending: true });
  if (error) return new Response("Export failed", { status: 500 });

  const rows = [
    "email,name,opted_in_at",
    ...(data ?? []).map((r) => [r.email, r.name, r.newsletter_opt_in_at].map(csvCell).join(",")),
  ];
  return new Response(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="filmory-nieuwsbrief-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
