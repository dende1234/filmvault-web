"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { subscribeVisitor, type NewsletterSignupError } from "@/actions/newsletter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ERROR_KEY: Record<NewsletterSignupError, keyof Dictionary> = {
  email: "newsletter_signup_error_email",
  rate: "newsletter_signup_error_rate",
  unavailable: "newsletter_signup_error_unavailable",
  generic: "newsletter_signup_error_generic",
};

/** "Blijf op de hoogte" for visitors (double opt-in via Brevo). Members manage
 * the newsletter in their profile, so they get a link there instead. */
export function NewsletterSignup({ signedIn, className }: { signedIn: boolean; className?: string }) {
  const { t } = useT();
  const [openedAt] = useState(() => Date.now());
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<NewsletterSignupError | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError("email");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await subscribeVisitor({ email, website, openedAt });
      if (result.ok) setSent(true);
      else setError(result.error);
    } catch {
      setError("generic");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={cn("rounded-card border border-border/70 bg-card/70 p-6 sm:p-8", className)}>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-balance">{t("newsletter_signup_title")}</h2>
        <p className="max-w-prose text-sm text-muted-foreground">{t("newsletter_signup_description")}</p>
      </div>

      {signedIn ? (
        <p className="mt-4 text-sm">
          {t("newsletter_signup_member")}{" "}
          <Link href="/profile" className="font-medium text-primary hover:underline">
            {t("newsletter_signup_member_link")}
          </Link>
        </p>
      ) : sent ? (
        <div className="mt-4 flex items-start gap-3" role="status">
          <MailCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
          <div>
            <p className="font-medium">{t("newsletter_signup_sent_title")}</p>
            <p className="text-sm text-muted-foreground">{t("newsletter_signup_sent_description")}</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="relative mt-5 flex flex-col gap-2">
          <Label htmlFor="newsletter-email" className="sr-only">
            {t("newsletter_signup_email_label")}
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="newsletter-email"
              type="email"
              autoComplete="email"
              placeholder={t("newsletter_signup_email_label")}
              maxLength={200}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error === "email"}
              className="sm:flex-1"
            />
            <Button type="submit" disabled={busy}>
              {busy ? t("newsletter_signup_sending") : t("newsletter_signup_button")}
            </Button>
          </div>
          {/* Honeypot: hidden from people and screen readers, bots fill it in. */}
          <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor="newsletter-website">Website</label>
            <input id="newsletter-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {t(ERROR_KEY[error])}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
