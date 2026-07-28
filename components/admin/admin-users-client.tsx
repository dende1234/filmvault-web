"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { setUserAdminStatus } from "@/actions/admin";
import type { AdminProfile } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AdminUsersClient({ profiles, currentUserId }: { profiles: AdminProfile[]; currentUserId: string | null }) {
  const { t } = useT();
  const router = useRouter();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

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
      <h1 className="text-2xl font-semibold">{t("admin_users_label")}</h1>

      {profiles.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("admin_users_empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {profiles.map((profile) => (
            <Card key={profile.id}>
              <CardContent className="flex items-center justify-between gap-3 pt-5">
                <div>
                  <p className="flex items-center gap-2 font-medium">
                    {profile.name || t("friends_unnamed_user")}
                    {profile.is_admin && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                        {t("admin_users_admin_badge")}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{profile.email}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={profile.id === currentUserId || processingIds.has(profile.id)}
                  onClick={() => toggle(profile)}
                >
                  {profile.is_admin ? t("admin_users_revoke_button") : t("admin_users_grant_button")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
