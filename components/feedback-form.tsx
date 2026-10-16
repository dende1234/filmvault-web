"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bug, CheckCircle2, ImageUp, Lightbulb, MessageCircle, X } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { createClient } from "@/lib/supabase/client";
import { FEEDBACK_BUCKET } from "@/lib/feedback";
import { MAX_IMAGE_INPUT_BYTES, toJpeg } from "@/lib/resize-image";
import { submitFeedback, type FeedbackError } from "@/actions/feedback";
import type { FeedbackKind } from "@/types/database";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const KIND_OPTIONS: { kind: FeedbackKind; icon: typeof Bug; label: keyof Dictionary; hint: keyof Dictionary }[] = [
  { kind: "bug", icon: Bug, label: "feedback_kind_bug", hint: "feedback_message_hint_bug" },
  { kind: "idea", icon: Lightbulb, label: "feedback_kind_idea", hint: "feedback_message_hint_idea" },
  { kind: "other", icon: MessageCircle, label: "feedback_kind_other", hint: "feedback_message_hint_other" },
];

const ERROR_KEY: Record<FeedbackError, keyof Dictionary> = {
  message: "feedback_error_message",
  email: "feedback_error_email",
  rate: "feedback_error_rate",
  screenshot: "feedback_error_screenshot",
  unavailable: "feedback_error_unavailable",
  generic: "feedback_error_generic",
};

/** Bug / idea / other, for users (with an optional screenshot) and visitors
 * (with an optional email). Page, browser, screen size and language are sent
 * along automatically, and the form says so. `page` overrides the current
 * path, e.g. the page a dialog was opened from. */
export function FeedbackForm({
  signedIn,
  page,
  onCancel,
  className,
}: {
  signedIn: boolean;
  page?: string;
  onCancel?: () => void;
  className?: string;
}) {
  const { t, locale } = useT();
  const pathname = usePathname();
  const [openedAt] = useState(() => Date.now());
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FeedbackError | null>(null);
  const [sent, setSent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const hint = KIND_OPTIONS.find((o) => o.kind === kind)!.hint;

  function reset() {
    setKind("bug");
    setMessage("");
    setEmail("");
    setScreenshot(null);
    setError(null);
    setSent(false);
  }

  async function uploadScreenshot(file: File): Promise<string> {
    const blob = await toJpeg(file, 1600);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("auth");
    const path = `${user.id}/${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await supabase.storage.from(FEEDBACK_BUCKET).upload(path, blob, { contentType: "image/jpeg" });
    if (uploadError) throw uploadError;
    return path;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 5) {
      setError("message");
      return;
    }
    if (!signedIn && email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError("email");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let screenshotPath: string | null = null;
      if (signedIn && screenshot) {
        try {
          screenshotPath = await uploadScreenshot(screenshot);
        } catch {
          setError("screenshot");
          return;
        }
      }
      const result = await submitFeedback({
        kind,
        message,
        contactEmail: signedIn ? null : email,
        page: page ?? pathname,
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        locale,
        screenshotPath,
        website,
        openedAt,
      });
      if (result.ok) setSent(true);
      else setError(result.error);
    } catch {
      setError("generic");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className={cn("flex flex-col items-center gap-3 py-6 text-center", className)} role="status">
        <CheckCircle2 className="size-10 text-success" aria-hidden />
        <p className="font-display text-xl font-semibold tracking-tight">{t("feedback_sent_title")}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{t(signedIn ? "feedback_sent_user" : "feedback_sent_visitor")}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {signedIn && (
            <Button asChild variant="secondary" onClick={onCancel}>
              <Link href="/my-feedback">{t("feedback_my_nav")}</Link>
            </Button>
          )}
          <Button variant="ghost" onClick={reset}>
            {t("feedback_send_another")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-5", className)} noValidate>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">{t("feedback_kind_label")}</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {KIND_OPTIONS.map(({ kind: k, icon: Icon, label }) => (
            <label
              key={k}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-elevated/40 px-3 py-2.5 text-sm transition-colors hover:border-foreground/20 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40",
                kind === k && "border-primary/60 bg-primary/10 text-foreground",
              )}
            >
              <input type="radio" name="feedback-kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
              <Icon className={cn("size-4 shrink-0", kind === k ? "text-primary" : "text-muted-foreground")} aria-hidden />
              {t(label)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="feedback-message">{t("feedback_message_label")}</Label>
        <Textarea
          id="feedback-message"
          rows={5}
          maxLength={4000}
          placeholder={t(hint)}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          aria-invalid={error === "message"}
        />
      </div>

      {signedIn ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">{t("feedback_screenshot_label")}</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              e.target.value = "";
              if (file && file.type.startsWith("image/") && file.size <= MAX_IMAGE_INPUT_BYTES) setScreenshot(file);
              else if (file) setError("screenshot");
            }}
          />
          {screenshot ? (
            <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-elevated/40 px-3 py-2 text-sm">
              <ImageUp className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{screenshot.name}</span>
              <button
                type="button"
                onClick={() => setScreenshot(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-elevated hover:text-foreground"
                aria-label={t("feedback_screenshot_remove")}
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={() => fileRef.current?.click()}>
              <ImageUp />
              {t("feedback_screenshot_add")}
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Label htmlFor="feedback-email">{t("feedback_email_label")}</Label>
          <Input
            id="feedback-email"
            type="email"
            autoComplete="email"
            maxLength={200}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error === "email"}
          />
          <p className="text-xs text-muted-foreground">{t("feedback_email_hint")}</p>
        </div>
      )}

      {/* Honeypot: hidden from people and screen readers, bots fill it in. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="feedback-website">Website</label>
        <input id="feedback-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      <p className="text-xs text-muted-foreground">
        {t("feedback_context_note")}
        {!signedIn && <> {t("feedback_screenshot_login_hint")}</>}
      </p>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {t(ERROR_KEY[error])}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            {t("action_cancel")}
          </Button>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? t("feedback_sending") : t("feedback_submit")}
        </Button>
      </div>
    </form>
  );
}
