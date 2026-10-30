"use server";

// Anonymous log of questions asked to Reel, to see what the help is missing
// (FilmVault/supabase/sql/help_questions.sql). No user id is stored; the
// RPCs insert and clean up rows older than 90 days. Before the SQL has run
// these do nothing, so Reel works without it.

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/admin/log";
import type { HelpEntry } from "@/lib/help/match";

function isMissing(error: { code?: string } | null) {
  return !!error && ["PGRST202", "PGRST205", "42P01", "42883"].includes(error.code ?? "");
}


export type HelpQuestionRow = {
  id: string;
  created_at: string;
  question: string;
  matched_id: string | null;
  helpful: boolean | null;
  locale: string | null;
  page: string | null;
};

/** Logs a typed question; returns its id (for the "did this help?" rating) or null. */
export async function logHelpQuestion(input: { question: string; matchedId: string | null; locale: string; page: string }) {
  const question = input.question.trim().slice(0, 300);
  if (!question) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("log_help_question", {
    p_question: question,
    p_matched_id: input.matchedId,
    p_locale: input.locale.slice(0, 5),
    p_page: input.page.slice(0, 200),
  });
  if (error) {
    if (!isMissing(error)) console.error("log_help_question", error);
    return null;
  }
  return (data as string | null) ?? null;
}

export async function rateHelpQuestion(id: string, helpful: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("rate_help_question", { p_id: id, p_helpful: helpful });
  if (error && !isMissing(error)) console.error("rate_help_question", error);
}

/** Admin: the logged questions (at most 90 days), newest first. null = table missing. */
export async function getHelpQuestions(): Promise<HelpQuestionRow[] | null> {
  await requireAdmin();
  const supabase = await createClient();
  try {
    return await fetchAll<HelpQuestionRow>(
      (from, to) =>
        supabase
          .from("help_questions")
          .select("id, created_at, question, matched_id, helpful, locale, page")
          .order("created_at", { ascending: false })
          .range(from, to),
      10000,
    );
  } catch (error) {
    if (isMissing(error as { code?: string })) return null;
    throw error;
  }
}

// --- Answers managed by admins (help_answers.sql) ---

export type HelpAnswerRow = {
  id: string;
  question_nl: string;
  question_en: string;
  answer_nl: string;
  answer_en: string;
  keywords_nl: string[];
  keywords_en: string[];
  pages: string[];
  possible: boolean;
  active: boolean;
  updated_at: string;
};

export type HelpAnswerInput = Omit<HelpAnswerRow, "id" | "updated_at"> & { id?: string | null };

/** The active answers as Reel entries ("db-<id>"); [] before the SQL has run. */
export async function getHelpAnswerEntries(): Promise<HelpEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("help_answers").select("*").eq("active", true).order("created_at");
  if (error) return [];
  return ((data ?? []) as HelpAnswerRow[]).map(toEntry);
}

function toEntry(r: HelpAnswerRow): HelpEntry {
  return {
    id: `db-${r.id}`,
    category: "custom",
    possible: r.possible,
    q: { nl: r.question_nl, en: r.question_en },
    a: { nl: r.answer_nl, en: r.answer_en },
    keywords: { nl: r.keywords_nl ?? [], en: r.keywords_en ?? [] },
    pages: r.pages?.length ? r.pages : undefined,
  };
}

/** Admin: every managed answer, active or not. null = table missing. */
export async function listHelpAnswers(): Promise<HelpAnswerRow[] | null> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("help_answers").select("*").order("updated_at", { ascending: false });
  if (isMissing(error)) return null;
  if (error) throw error;
  return (data ?? []) as HelpAnswerRow[];
}

const clean = (list: string[]) => Array.from(new Set(list.map((k) => k.trim().toLowerCase()).filter(Boolean))).slice(0, 30);

export async function saveHelpAnswer(input: HelpAnswerInput): Promise<{ error: "invalid" | "not_ready" | null }> {
  await requireAdmin();
  const row = {
    question_nl: input.question_nl.trim(),
    question_en: input.question_en.trim(),
    answer_nl: input.answer_nl.trim(),
    answer_en: input.answer_en.trim(),
    keywords_nl: clean(input.keywords_nl),
    keywords_en: clean(input.keywords_en),
    pages: input.pages.map((p) => p.trim()).filter((p) => p.startsWith("/")).slice(0, 10),
    possible: input.possible,
    active: input.active,
    updated_at: new Date().toISOString(),
  };
  if ([row.question_nl, row.question_en, row.answer_nl, row.answer_en].some((v) => v.length < 3)) return { error: "invalid" };
  const supabase = await createClient();
  const { data, error } = input.id
    ? await supabase.from("help_answers").update(row).eq("id", input.id).select("id").single()
    : await supabase.from("help_answers").insert(row).select("id").single();
  if (isMissing(error)) return { error: "not_ready" };
  if (error?.code === "23514") return { error: "invalid" };
  if (error) throw error;
  await logAdminAction("help_answer_save", { type: "help_answer", id: (data as { id: string }).id }, { question: row.question_nl });
  revalidatePath("/admin/feedback");
  return { error: null };
}

export async function deleteHelpAnswer(id: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("help_answers").delete().eq("id", id);
  if (error) throw error;
  await logAdminAction("help_answer_delete", { type: "help_answer", id });
  revalidatePath("/admin/feedback");
}
