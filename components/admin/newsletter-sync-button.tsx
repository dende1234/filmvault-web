"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { adminSyncNewsletter } from "@/actions/newsletter";
import { Button } from "@/components/ui/button";

/** One-off (and safe to repeat) push of all newsletter opt-ins to Brevo. */
export function NewsletterSyncButton() {
  const { t } = useT();
  const [busy, setBusy] = useState(false);

  async function sync() {
    setBusy(true);
    try {
      const result = await adminSyncNewsletter();
      if (!result.configured) toast.error(t("admin_growth_sync_not_configured"));
      else if (result.failed > 0) toast.warning(t("admin_growth_sync_partial", result.synced, result.failed));
      else toast.success(t("admin_growth_sync_done", result.synced));
    } catch {
      toast.error(t("admin_growth_sync_error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="secondary" onClick={sync} disabled={busy}>
      <RefreshCw className={busy ? "animate-spin" : undefined} />
      {t("admin_growth_sync_newsletter")}
    </Button>
  );
}
