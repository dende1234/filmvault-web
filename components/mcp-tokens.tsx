"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bot, Copy, Trash2 } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { createMcpToken, revokeMcpToken, type McpTokenRow } from "@/actions/mcp-tokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Connect an AI assistant (Claude and other MCP clients) to your collection,
 * read-only, with a personal token. Shown only when the "mcp" switch is on. */
export function McpTokens({ tokens, endpoint }: { tokens: McpTokenRow[] | null; endpoint: string }) {
  const { t, locale } = useT();
  const router = useRouter();
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const date = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "nl-NL", { dateStyle: "medium" });

  const copy = (text: string) =>
    navigator.clipboard.writeText(text).then(
      () => toast.success(t("mcp_copied")),
      () => toast.error(t("mcp_copy_failed")),
    );

  const claudeCode = fresh ? `claude mcp add --transport http filmory ${endpoint} --header "Authorization: Bearer ${fresh}"` : "";
  const desktopConfig = fresh
    ? JSON.stringify(
        { mcpServers: { filmory: { command: "npx", args: ["-y", "mcp-remote", endpoint, "--header", `Authorization: Bearer ${fresh}`] } } },
        null,
        2,
      )
    : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="size-5 text-primary" aria-hidden />
          {t("mcp_title")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t("mcp_hint")}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {tokens === null ? (
          <p className="text-sm text-muted-foreground">{t("mcp_not_ready")}</p>
        ) : (
          <>
            {fresh && (
              <div className="flex flex-col gap-2 rounded-card border border-primary/40 bg-primary/5 p-3 text-sm">
                <p className="font-medium">{t("mcp_token_once")}</p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded bg-elevated px-2 py-1 font-mono text-xs">{fresh}</code>
                  <Button size="icon" variant="ghost" aria-label={t("mcp_copy")} onClick={() => copy(fresh)}>
                    <Copy className="size-4" aria-hidden />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t("mcp_claude_code")}</p>
                <pre className="overflow-x-auto rounded bg-elevated p-2 text-xs">{claudeCode}</pre>
                <Button size="sm" variant="outline" className="self-start" onClick={() => copy(claudeCode)}>
                  {t("mcp_copy_command")}
                </Button>
                <p className="text-xs text-muted-foreground">{t("mcp_claude_desktop")}</p>
                <pre className="overflow-x-auto rounded bg-elevated p-2 text-xs">{desktopConfig}</pre>
                <Button size="sm" variant="outline" className="self-start" onClick={() => copy(desktopConfig)}>
                  {t("mcp_copy_config")}
                </Button>
                <p className="text-xs text-muted-foreground">{t("mcp_url", endpoint)}</p>
              </div>
            )}

            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const r = await createMcpToken(name).catch(() => ({ error: "failed" as const }));
                  if ("token" in r) {
                    setFresh(r.token);
                    setName("");
                    router.refresh();
                  } else {
                    toast.error(t(`mcp_error_${r.error}` as Parameters<typeof t>[0]));
                  }
                });
              }}
            >
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                placeholder={t("mcp_name_placeholder")}
                aria-label={t("mcp_name_label")}
                className="w-56"
                disabled={pending}
              />
              <Button type="submit" disabled={pending || !name.trim()}>
                {t("mcp_create")}
              </Button>
            </form>

            {tokens.length > 0 && (
              <ul className="divide-y divide-border/60 text-sm">
                {tokens.map((tok) => (
                  <li key={tok.id} className="flex items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{tok.name}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono">{tok.token_hint}</span> · {t("mcp_created", date.format(new Date(tok.created_at)))}
                        {" · "}
                        {tok.last_used_at ? t("mcp_last_used", date.format(new Date(tok.last_used_at))) : t("mcp_never_used")}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t("mcp_revoke", tok.name)}
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const r = await revokeMcpToken(tok.id).catch(() => ({ error: "failed" as const }));
                          if (r.error) toast.error(t("mcp_error_failed"));
                          else toast.success(t("mcp_revoked"));
                          router.refresh();
                        })
                      }
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
