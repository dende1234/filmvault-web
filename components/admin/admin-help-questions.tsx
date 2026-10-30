import { HELP_ENTRIES } from "@/lib/help/faq";
import type { HelpAnswerRow, HelpQuestionRow } from "@/actions/help";
import { HelpAnswerButton, HelpAnswersList } from "@/components/admin/help-answers";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { format } from "@/lib/i18n/dictionary";
import { Card, CardContent } from "@/components/ui/card";

/** What Reel couldn't answer and which answers didn't help: the to-do list
 * for lib/help/faq.ts. Rows are anonymous and at most 90 days old. */
export function AdminHelpQuestions({
  rows,
  answers,
  dict,
  locale,
}: {
  rows: HelpQuestionRow[];
  /** Answers managed here (help_answers.sql); null before that has run. */
  answers: HelpAnswerRow[] | null;
  dict: Dictionary;
  locale: string;
}) {
  const unanswered = new Map<string, { text: string; count: number; last: string }>();
  const perEntry = new Map<string, { asked: number; yes: number; no: number }>();
  let rated = 0;
  let helpful = 0;
  for (const r of rows) {
    if (r.helpful !== null) {
      rated++;
      if (r.helpful) helpful++;
    }
    if (!r.matched_id) {
      const key = r.question.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
      const g = unanswered.get(key);
      if (g) g.count++;
      else unanswered.set(key, { text: r.question, count: 1, last: r.created_at });
    } else {
      const e = perEntry.get(r.matched_id) ?? { asked: 0, yes: 0, no: 0 };
      e.asked++;
      if (r.helpful === true) e.yes++;
      if (r.helpful === false) e.no++;
      perEntry.set(r.matched_id, e);
    }
  }
  const answeredCount = rows.filter((r) => r.matched_id).length;
  const pct = (n: number, d: number) => (d === 0 ? "–" : `${Math.round((n / d) * 100)}%`);
  const topUnanswered = Array.from(unanswered.values()).sort((a, b) => b.count - a.count || b.last.localeCompare(a.last)).slice(0, 50);
  const entries = Array.from(perEntry.entries())
    .map(([id, s]) => ({ id, ...s, title:
        HELP_ENTRIES.find((e) => e.id === id)?.q[locale === "en" ? "en" : "nl"] ??
        (() => {
          const a = answers?.find((x) => `db-${x.id}` === id);
          return a ? (locale === "en" ? a.question_en : a.question_nl) : id;
        })(),
    }))
    .sort((a, b) => b.no - a.no || b.asked - a.asked);
  const date = (iso: string) => new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "nl-NL", { day: "numeric", month: "short" });

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">{dict.admin_help_intro}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={dict.admin_help_total} value={String(rows.length)} />
        <Stat label={dict.admin_help_answered} value={pct(answeredCount, rows.length)} />
        <Stat label={dict.admin_help_helpful} value={pct(helpful, rated)} hint={format(dict.admin_help_rated, rated)} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold tracking-tight">{dict.admin_help_unanswered_title}</h2>
        {topUnanswered.length === 0 ? (
          <p className="text-sm text-muted-foreground">{dict.admin_help_unanswered_empty}</p>
        ) : (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {topUnanswered.map((q) => (
                <div key={q.text + q.last} className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm">
                  <span className="min-w-0 break-words">{q.text}</span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground tabular-nums">
                    {q.count > 1 && <strong className="text-foreground">{q.count}×</strong>}
                    {date(q.last)}
                    {answers !== null && <HelpAnswerButton question={q.text} variant="ghost" />}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-semibold tracking-tight">{dict.help_answers_title}</h2>
          {answers !== null && <HelpAnswerButton variant="default" />}
        </div>
        {answers === null ? <p className="text-sm text-muted-foreground">{dict.help_answer_not_ready}</p> : <HelpAnswersList rows={answers} />}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold tracking-tight">{dict.admin_help_entries_title}</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{dict.admin_help_unanswered_empty}</p>
        ) : (
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 font-medium">{dict.admin_help_col_entry}</th>
                    <th className="px-3 py-2 text-right font-medium">{dict.admin_help_col_asked}</th>
                    <th className="px-3 py-2 text-right font-medium">{dict.admin_help_col_yes}</th>
                    <th className="px-4 py-2 text-right font-medium">{dict.admin_help_col_no}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-2.5">
                        {e.title}
                        <span className="ml-2 font-mono text-[11px] text-muted-foreground">{e.id}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{e.asked}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-success">{e.yes || ""}</td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums text-destructive">{e.no || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-0.5 pt-5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-display text-2xl font-semibold tabular-nums">{value}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </CardContent>
    </Card>
  );
}
