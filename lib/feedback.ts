import type { FeedbackKind, FeedbackStatus } from "@/types/database";

/** Private Supabase Storage bucket for feedback screenshots, files at
 * {user_id}/{uuid}.jpg (user_feedback.sql). */
export const FEEDBACK_BUCKET = "feedback";

export const FEEDBACK_KINDS: FeedbackKind[] = ["bug", "idea", "other"];
export const FEEDBACK_STATUSES: FeedbackStatus[] = ["new", "in_progress", "planned", "done", "declined"];

/** Badge colour per status, shared by "My feedback" and the admin inbox. */
export const FEEDBACK_STATUS_VARIANT: Record<FeedbackStatus, "secondary" | "warning" | "default" | "success" | "outline"> = {
  new: "secondary",
  in_progress: "warning",
  planned: "default",
  done: "success",
  declined: "outline",
};
