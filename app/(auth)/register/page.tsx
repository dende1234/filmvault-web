"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp } from "@/actions/auth";
import { useT } from "@/lib/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const { t } = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      const result = await signUp(email, password);
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
      <h2 className="text-center text-lg font-semibold">{t("register_title")}</h2>

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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending} className="mt-2">
        {t("register_button")}
      </Button>

      <div className="flex justify-center text-sm">
        <Link href="/login" className="text-primary hover:underline">
          {t("register_login_link")}
        </Link>
      </div>
    </form>
  );
}
