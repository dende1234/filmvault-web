"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { deleteUserAccount, setUserAdminStatus } from "@/actions/admin";
import type { AdminProfile } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function AdminUsersClient({ profiles, currentUserId }: { profiles: AdminProfile[]; currentUserId: string | null }) {
  const { t } = useT();
  const router = useRouter();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<AdminProfile | null>(null);

  async function toggle(profile: AdminProfile) {
    setProcessingIds((prev) => new Set(prev).add(profile.id));
    try {
      await setUserAdminStatus(profile.id, !profile.is_admin);
      router.refresh();
    } catch {
      toast.error(t("admin_users_error_action"));
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(profile.id);
        return next;
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">

      {profiles.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("admin_users_empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {profiles.map((profile) => (
            <Card key={profile.id}>
              <CardContent className="flex items-center justify-between gap-3 pt-5">
                <div>
                  <p className="flex items-center gap-2 font-medium">
                    <Link href={`/admin/users/${profile.id}`} className="hover:text-primary">
                      {profile.name || t("friends_unnamed_user")}
                    </Link>
                    {profile.is_admin && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                        {t("admin_users_admin_badge")}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{profile.email}</p>
                </div>
                {profile.id !== currentUserId &&
                  (processingIds.has(profile.id) ? (
                    <div className="h-10 w-10 animate-pulse rounded-full bg-muted" aria-hidden />
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={t("admin_users_actions_description")}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggle(profile)}>
                          {profile.is_admin ? t("admin_users_revoke_button") : t("admin_users_grant_button")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(profile)}
                        >
                          {t("admin_users_delete_button")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DeleteUserDialog
        profile={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        isProcessing={!!deleteTarget && processingIds.has(deleteTarget.id)}
        onDeleted={() => {
          setDeleteTarget(null);
          router.refresh();
        }}
        setProcessingIds={setProcessingIds}
      />
    </div>
  );
}

function DeleteUserDialog({
  profile,
  onOpenChange,
  isProcessing,
  onDeleted,
  setProcessingIds,
}: {
  profile: AdminProfile | null;
  onOpenChange: (open: boolean) => void;
  isProcessing: boolean;
  onDeleted: () => void;
  setProcessingIds: (updater: (prev: Set<string>) => Set<string>) => void;
}) {
  const { t } = useT();
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const confirmValue = profile?.email || profile?.id || "";

  async function handleConfirm() {
    if (!profile) return;
    setProcessingIds((prev) => new Set(prev).add(profile.id));
    setError(null);
    try {
      await deleteUserAccount(profile.id);
      toast.success(t("admin_users_delete_success"));
      setConfirmText("");
      onDeleted();
    } catch {
      setError(t("admin_users_delete_error"));
      toast.error(t("admin_users_delete_error"));
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(profile.id);
        return next;
      });
    }
  }

  return (
    <Dialog
      open={!!profile}
      onOpenChange={(open) => {
        if (!open) setConfirmText("");
        onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin_users_delete_dialog_title")}</DialogTitle>
          <DialogDescription>{t("admin_users_delete_dialog_text", confirmValue)}</DialogDescription>
        </DialogHeader>
        <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} disabled={isProcessing} />
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            {t("action_cancel")}
          </Button>
          <Button variant="destructive" disabled={confirmText !== confirmValue || isProcessing} onClick={handleConfirm}>
            {t("action_delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
