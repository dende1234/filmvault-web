import Link from "next/link";
import { getQualityReport } from "@/actions/admin-quality";
import type { BarcodeRow } from "@/lib/admin/quality";
import { getDictionary, format, type Dictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { titleHref } from "@/lib/titles";
import { PageHeader } from "@/components/page-header";
import { Poster } from "@/components/movie/poster";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SHOW = 100;

function Rows({ rows, dict }: { rows: BarcodeRow[]; dict: Dictionary }) {
  return (
    <ul className="divide-y divide-border/60 text-sm">
      {rows.slice(0, SHOW).map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
          <span className="font-mono text-xs">{r.barcode}</span>
          <Link href={titleHref(r.tmdb_movie_id)} className="text-xs text-primary hover:underline" target="_blank">
            TMDB #{Math.abs(r.tmdb_movie_id)}
          </Link>
          <span className="text-xs text-muted-foreground">
            {r.type || "–"} · {r.editie || "–"}
            {r.is_box && ` · ${dict.admin_quality_box}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Data quality of the master film list. Fix entries in Films beheren. */
export default async function AdminQualityPage() {
  const dict = getDictionary(await getLocale());
  const r = await getQualityReport();
  const more = (n: number) => (n > SHOW ? <p className="pt-2 text-xs text-muted-foreground">{format(dict.admin_quality_more, n - SHOW)}</p> : null);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader
        title={dict.admin_quality_title}
        description={format(dict.admin_quality_subtitle, r.total)}
        actions={
          <Link href="/admin/manage-films" className="text-sm text-primary hover:underline">
            {dict.admin_manage_films_label}
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {dict.admin_quality_without_title}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{dict.admin_quality_without_hint}</p>
        </CardHeader>
        <CardContent>
          {r.withoutBarcode === null ? (
            <p className="text-sm text-muted-foreground">{dict.admin_quality_without_not_ready}</p>
          ) : r.withoutBarcode.length === 0 ? (
            <p className="text-sm text-muted-foreground">{dict.admin_quality_none}</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {r.withoutBarcode.map((t) => (
                <li key={t.tmdb_movie_id} className="flex items-center gap-3 py-2">
                  <Poster path={t.movie_poster} title={t.movie_title} size="xs" className="w-8 shrink-0" />
                  <Link href={titleHref(t.tmdb_movie_id)} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary">
                    {t.movie_title}
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground">{format(dict.admin_quality_owners, t.owners, t.copies)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {dict.admin_quality_duplicates_title} <Badge variant={r.duplicates.length ? "warning" : "success"}>{r.duplicates.length}</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">{dict.admin_quality_duplicates_hint}</p>
        </CardHeader>
        <CardContent>
          {r.duplicates.length === 0 ? (
            <p className="text-sm text-muted-foreground">{dict.admin_quality_none}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {r.duplicates.slice(0, SHOW).map((d) => (
                <li key={d.barcode}>
                  <Rows rows={d.rows} dict={dict} />
                </li>
              ))}
            </ul>
          )}
          {more(r.duplicates.length)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {dict.admin_quality_invalid_title} <Badge variant={r.invalid.length ? "warning" : "success"}>{r.invalid.length}</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">{dict.admin_quality_invalid_hint}</p>
        </CardHeader>
        <CardContent>
          {r.invalid.length === 0 ? <p className="text-sm text-muted-foreground">{dict.admin_quality_none}</p> : <Rows rows={r.invalid} dict={dict} />}
          {more(r.invalid.length)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {dict.admin_quality_details_title} <Badge variant={r.missingDetails.length ? "warning" : "success"}>{r.missingDetails.length}</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">{dict.admin_quality_details_hint}</p>
        </CardHeader>
        <CardContent>
          {r.missingDetails.length === 0 ? <p className="text-sm text-muted-foreground">{dict.admin_quality_none}</p> : <Rows rows={r.missingDetails} dict={dict} />}
          {more(r.missingDetails.length)}
        </CardContent>
      </Card>
    </div>
  );
}
