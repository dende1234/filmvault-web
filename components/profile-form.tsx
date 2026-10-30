"use client";

import { cloneElement, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { Avatar } from "@/components/avatar";
import { NewsletterToggle } from "@/components/newsletter-toggle";
import { EmailDigestToggle } from "@/components/email-digest-toggle";
import { updateProfile, setThemePreference, setLocale, deleteAccount } from "@/actions/profile";
import { signOut } from "@/actions/auth";
import type { Profile, ThemePreference } from "@/types/database";
import type { Locale } from "@/lib/i18n/dictionary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function ProfileForm({ profile }: { profile: Profile }) {
  const { t, locale } = useT();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  // `language` intentionally initializes from the cookie-derived `locale`
  // (what the page actually renders in) rather than `profile.language` —
  // that DB column defaults to 'en' for any profile that never explicitly
  // saved a choice, which otherwise shows the toggle pre-selected on
  // "Engels" while the rest of the page renders in Dutch (the real,
  // visible bug this fixes, found during Fase 6 theme QA).
  const [form, setForm] = useState({
    name: profile.name ?? "",
    bio: profile.bio ?? "",
    location: profile.location ?? "",
    website: profile.website ?? "",
    avatar_url: profile.avatar_url ?? "",
    theme_preference: (profile.theme_preference ?? "system") as ThemePreference,
    language: locale as Locale,
  });
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateProfile({
        name: form.name || null,
        bio: form.bio || null,
        location: form.location || null,
        website: form.website || null,
        avatar_url: form.avatar_url || null,
      });
      if (result.error) {
        setError(t("profile_error_save"));
        return;
      }
      await Promise.all([setThemePreference(form.theme_preference), setLocale(form.language)]);
      setIsEditing(false);
      router.refresh();
    });
  }

  function cancelEditing() {
    setForm({
      name: profile.name ?? "",
      bio: profile.bio ?? "",
      location: profile.location ?? "",
      website: profile.website ?? "",
      avatar_url: profile.avatar_url ?? "",
      theme_preference: (profile.theme_preference ?? "system") as ThemePreference,
      language: locale as Locale,
    });
    setError(null);
    setIsEditing(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <Avatar src={form.avatar_url} name={form.name} className="size-22 text-2xl ring-2 ring-primary/40" />
        <h1 className="font-display text-3xl font-semibold tracking-tight">{form.name || t("app_name")}</h1>
        <p className="text-sm text-muted-foreground">{profile.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("profile_about_me_title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Field label={t("label_name")} id="name">
            <Input disabled={!isEditing} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label={t("profile_bio_label")} id="bio">
            <Textarea disabled={!isEditing} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </Field>
          <Field label={t("profile_location_label")} id="location">
            <Input disabled={!isEditing} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
          <Field label={t("profile_website_label")} id="website">
            <Input disabled={!isEditing} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          </Field>
          <Field label={t("profile_avatar_url_label")} id="avatar_url">
            <Input disabled={!isEditing} value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("profile_preferences_title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-sm font-medium">{t("profile_theme_label")}</p>
            <SegmentedRow
              disabled={!isEditing}
              value={form.theme_preference}
              onChange={(v) => setForm({ ...form, theme_preference: v as ThemePreference })}
              options={[
                { value: "system", label: t("theme_system") },
                { value: "light", label: t("theme_light") },
                { value: "dark", label: t("theme_dark") },
              ]}
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">{t("label_language")}</p>
            <SegmentedRow
              disabled={!isEditing}
              value={form.language}
              onChange={(v) => setForm({ ...form, language: v as Locale })}
              options={[
                { value: "nl", label: t("language_dutch") },
                { value: "en", label: t("language_english") },
              ]}
            />
          </div>
          <div className="border-t border-border/60 pt-4">
            <p className="mb-2 text-sm font-medium">{t("newsletter_label")}</p>
            <NewsletterToggle initial={profile.newsletter_opt_in === true} />
          </div>
          <div className="border-t border-border/60 pt-4">
            <p className="mb-2 text-sm font-medium">{t("digest_title")}</p>
            <EmailDigestToggle initial={profile.email_digest === true} />
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isEditing ? (
        <div className="flex flex-col gap-2">
          <Button onClick={save} disabled={isPending}>
            {t("action_save")}
          </Button>
          <Button onClick={cancelEditing} variant="outline" disabled={isPending}>
            {t("action_cancel")}
          </Button>
        </div>
      ) : (
        <Button onClick={() => setIsEditing(true)}>{t("profile_edit_button")}</Button>
      )}

      <div className="mt-4 border-t border-border pt-6">
        <h2 className="mb-2 text-base font-semibold text-destructive">{t("profile_danger_zone_title")}</h2>
        <p className="mb-3 text-sm text-muted-foreground">{t("profile_delete_account_warning")}</p>
        <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} className="w-full">
          {t("profile_delete_account_button")}
        </Button>
      </div>

      <DeleteAccountDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onDeleted={async () => {
          await signOut();
          router.replace("/login");
          router.refresh();
        }}
      />
    </div>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactElement<{ id?: string }>;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {cloneElement(children, { id })}
    </div>
  );
}

function SegmentedRow<T extends string>({
  value,
  onChange,
  options,
  disabled,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex rounded-full bg-muted p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
            value === opt.value ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function DeleteAccountDialog({
  open,
  onOpenChange,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const { t } = useT();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmWord = t("profile_delete_confirm_word");

  async function handleConfirm() {
    setIsDeleting(true);
    setError(null);
    const result = await deleteAccount();
    setIsDeleting(false);
    if (result.error) {
      setError(t("profile_error_delete_account"));
      toast.error(t("profile_error_delete_account"));
      return;
    }
    onDeleted();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("profile_delete_account_button")}</DialogTitle>
          <DialogDescription>{t("profile_delete_account_dialog_text", confirmWord)}</DialogDescription>
        </DialogHeader>
        <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} disabled={isDeleting} />
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            {t("action_cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={confirmText !== confirmWord || isDeleting}
            onClick={handleConfirm}
          >
            {t("action_delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
