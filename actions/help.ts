"use server";

// Anonymous log of questions asked to Reel, to see what the help is missing
// (FilmVault/supabase/sql/help_questions.sql). No user id is stored; the
// RPCs insert and clean up rows older than 90 days. Before the SQL has run
// these do nothing, so Reel works without it.

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import { fetchAll } from "@/lib/supabase/fetch-all";

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
