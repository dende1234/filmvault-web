import Link from "next/link";
import { Search } from "lucide-react";
import { getProfilesPage } from "@/actions/admin";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, format } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { AdminUsersClient } from "@/components/admin/admin-users-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const supabase = await createClient();
  const [{ q = "", page }, { data: auth }, dict] = await Promise.all([searchParams, supabase.auth.getUser(), getLocale().then(getDictionary)]);
  const pageNo = Math.max(0, Number(page) || 0);
  const { profiles, total, pageSize } = await getProfilesPage(q, pageNo);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => `/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(p ? { page: String(p) } : {}) })}`;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{dict.admin_users_label}</h1>
      <form className="flex gap-2" action="/admin/users">
        <Input name="q" defaultValue={q} placeholder={dict.admin_users_search} aria-label={dict.admin_users_search} />
        <Button type="submit" variant="secondary">
          <Search />
          {dict.admin_users_search_button}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">{format(q ? dict.admin_users_found : dict.admin_users_total, total)}</p>
      <AdminUsersClient profiles={profiles} currentUserId={auth.user?.id ?? null} />
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          {pageNo > 0 && (
            <Button asChild variant="secondary" size="sm">
              <Link href={href(pageNo - 1)}>{dict.action_previous}</Link>
            </Button>
          )}
          <span className="text-sm tabular-nums text-muted-foreground">{format(dict.import_page_of, pageNo + 1, pages)}</span>
          {pageNo < pages - 1 && (
            <Button asChild variant="secondary" size="sm">
              <Link href={href(pageNo + 1)}>{dict.action_next}</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
