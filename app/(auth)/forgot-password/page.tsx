"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/actions/auth";
import { useT } from "@/lib/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setError(t("forgot_password_error_empty_email"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await requestPasswordReset(email);
      if (result.error) setError(result.error);
      else setSent(true);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-2xl font-semibold tracking-tight">{t("forgot_password_title")}</h2>

      {sent ? (
        <p className="text-sm text-muted-foreground">{t("forgot_password_email_sent")}</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{t("forgot_password_instructions")}</p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t("email_label")}</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={isPending}>
            {t("forgot_password_button")}
          </Button>
        </form>
      )}

      <div className="flex justify-center text-sm">
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t("forgot_password_back_to_login")}
        </Link>
      </div>
    </div>
  );
}
