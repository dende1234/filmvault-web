"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { deleteHelpAnswer, saveHelpAnswer, type HelpAnswerInput, type HelpAnswerRow } from "@/actions/help";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const list = (text: string) => text.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);

function emptyInput(question = ""): HelpAnswerInput {
  return { question_nl: question, question_en: "", answer_nl: "", answer_en: "", keywords_nl: [], keywords_en: [], pages: [], possible: true, active: true };
}

/** Add or edit a Reel answer. `question` prefills the Dutch question (from
 * an unanswered one); `row` edits an existing answer. */
export function HelpAnswerButton({ question, row, variant = "outline" }: { question?: string; row?: HelpAnswerRow; variant?: "outline" | "ghost" | "default" }) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<HelpAnswerInput>(() => (row ? { ...row } : emptyInput(question)));
  const [keywordsNl, setKeywordsNl] = useState((row?.keywords_nl ?? []).join(", "));
  const [keywordsEn, setKeywordsEn] = useState((row?.keywords_en ?? []).join(", "));
  const [pages, setPages] = useState((row?.pages ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<HelpAnswerInput>) => setForm((f) => ({ ...f, ...patch }));

  async function save() {
    setSaving(true);
    try {
      const result = await saveHelpAnswer({ ...form, keywords_nl: list(keywordsNl), keywords_en: list(keywordsEn), pages: list(pages) });
      if (result.error === "not_ready") toast.error(t("help_answer_not_ready"));
      else if (result.error) toast.error(t("help_answer_invalid"));
      else {
        toast.success(t("help_answer_saved"));
        setOpen(false);
        router.refresh();
      }
    } catch {
      toast.error(t("help_answer_error"));
    } finally {
      setSaving(false);
    }
  }

  const field = (id: keyof HelpAnswerInput, label: string, multiline = false) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`ha-${id}`}>{label}</Label>
      {multiline ? (
        <Textarea id={`ha-${id}`} rows={4} maxLength={2000} value={String(form[id] ?? "")} onChange={(e) => set({ [id]: e.target.value })} />
      ) : (
        <Input id={`ha-${id}`} maxLength={200} value={String(form[id] ?? "")} onChange={(e) => set({ [id]: e.target.value })} />
      )}
    </div>
  );

  return (
    <>
      <Button size="sm" variant={variant} onClick={() => setOpen(true)}>
        {row ? <Pencil /> : <Plus />}
        {row ? t("help_answer_edit") : t("help_answer_add")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{row ? t("help_answer_edit") : t("help_answer_add")}</DialogTitle>
            <DialogDescription>{t("help_answer_hint")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {field("question_nl", t("help_answer_question_nl"))}
            {field("question_en", t("help_answer_question_en"))}
            {field("answer_nl", t("help_answer_answer_nl"), true)}
            {field("answer_en", t("help_answer_answer_en"), true)}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ha-kw-nl">{t("help_answer_keywords_nl")}</Label>
              <Input id="ha-kw-nl" value={keywordsNl} onChange={(e) => setKeywordsNl(e.target.value)} placeholder="exporteren, csv, backup" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ha-kw-en">{t("help_answer_keywords_en")}</Label>
              <Input id="ha-kw-en" value={keywordsEn} onChange={(e) => setKeywordsEn(e.target.value)} placeholder="export, csv, backup" />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="ha-pages">{t("help_answer_pages")}</Label>
              <Input id="ha-pages" value={pages} onChange={(e) => setPages(e.target.value)} placeholder="/collections, /scannen" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={!form.possible} onCheckedChange={(v) => set({ possible: v !== true })} />
              {t("help_answer_not_possible")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.active} onCheckedChange={(v) => set({ active: v === true })} />
              {t("help_answer_active")}
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("action_cancel")}
            </Button>
            <Button onClick={save} disabled={saving}>
              {t("action_save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** The managed answers, newest change first. */
export function HelpAnswersList({ rows }: { rows: HelpAnswerRow[] }) {
  const { t, locale } = useT();
  const router = useRouter();

  async function remove(row: HelpAnswerRow) {
    if (!window.confirm(t("help_answer_delete_confirm"))) return;
    try {
      await deleteHelpAnswer(row.id);
      router.refresh();
    } catch {
      toast.error(t("help_answer_error"));
    }
  }

  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{t("help_answers_empty")}</p>;
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <Card key={r.id}>
          <CardContent className="flex flex-col gap-2 pt-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium">
                {locale === "en" ? r.question_en : r.question_nl}
                {!r.active && <Badge variant="outline" className="ml-2">{t("help_answer_inactive")}</Badge>}
                {!r.possible && <Badge variant="warning" className="ml-2">{t("help_answer_not_possible_badge")}</Badge>}
              </p>
              <p className="line-clamp-2 text-sm text-muted-foreground">{locale === "en" ? r.answer_en : r.answer_nl}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <HelpAnswerButton row={r} variant="ghost" />
              <Button size="sm" variant="ghost" onClick={() => remove(r)} aria-label={t("action_delete")}>
                <Trash2 />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
