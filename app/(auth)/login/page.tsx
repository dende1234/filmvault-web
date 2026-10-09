"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "@/actions/auth";
import { useT } from "@/lib/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const { t } = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError(t("login_error_fill_fields"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await signIn(email, password);
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
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-semibold tracking-tight">{t("login_title")}</h2>
        <p className="text-sm text-muted-foreground">{t("login_subtitle")}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{t("email_label")}</Label>
        <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{t("password_label")}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending} className="mt-2">
        {t("login_button")}
      </Button>

      <div className="flex flex-col items-center gap-2 text-sm">
        <Link href="/forgot-password" className="font-medium text-primary hover:underline">
          {t("login_forgot_password")}
        </Link>
        <Link href="/register" className="font-medium text-primary hover:underline">
          {t("login_register_link")}
        </Link>
      </div>
    </form>
  );
}
