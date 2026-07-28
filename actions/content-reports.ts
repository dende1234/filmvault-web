"use server";

// Direct port of admin/ContentReportRepository.kt.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import type { ContentReport, ContentType } from "@/types/database";

export async function reportContent(contentType: ContentType, contentId: string, reason: string | null): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");

  const { error } = await supabase
    .from("content_reports")
    .insert({ reporter_id: user.id, content_type: contentType, content_id: contentId, reason: reason?.trim() || null });
  if (error) throw error;
}

export async function getOpenReports(): Promise<ContentReport[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("content_reports").select("*").eq("status", "open");
  if (error) throw error;
  return data as ContentReport[];
}

export async function resolveReport(reportId: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("content_reports").update({ status: "resolved" }).eq("id", reportId);
  if (error) throw error;
  revalidatePath("/admin/reports");
}

export async function dismissReport(reportId: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("content_reports").update({ status: "dismissed" }).eq("id", reportId);
  if (error) throw error;
  revalidatePath("/admin/reports");
}
