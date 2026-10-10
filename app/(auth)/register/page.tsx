"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp } from "@/actions/auth";
import { useT } from "@/lib/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function RegisterPage() {
  const { t } = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // GDPR: consent must be an active choice, so this starts unchecked.
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError(t("register_error_password_length"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("register_error_password_mismatch"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await signUp(email, password, newsletterOptIn);
      if (result.error) {
        setError(result.error);
      } else {
        router.replace("/dashboard");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="font-display text-2xl font-semibold tracking-tight">{t("register_title")}</h2>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{t("email_label")}</Label>
        <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{t("password_label")}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-password">{t("register_confirm_password_label")}</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      <div className="flex items-start gap-3">
        <Checkbox
          id="newsletter"
          checked={newsletterOptIn}
          onCheckedChange={(v) => setNewsletterOptIn(v === true)}
          className="mt-0.5"
        />
        <Label htmlFor="newsletter" className="text-sm font-normal leading-snug text-muted-foreground">
          {t("newsletter_opt_in_label")}
        </Label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending} className="mt-2">
        {t("register_button")}
      </Button>

      <div className="flex justify-center text-sm">
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t("register_login_link")}
        </Link>
      </div>
    </form>
  );
}
