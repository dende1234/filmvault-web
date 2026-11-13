"use client";

import { createContext, useCallback, useContext, useEffect, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Gift, Undo2 } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { getGiftStatus, reserveGift, unreserveGift } from "@/actions/wishlist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const TOKEN_KEY = "fv_gift_token";

/** A random id for this browser, so a visitor can see and undo their own
 * reservations. Not tied to an account; kept in memory when storage is blocked. */
let memoryToken: string | null = null;
function visitorToken(): string {
  try {
    const saved = window.localStorage.getItem(TOKEN_KEY);
    if (saved && /^[A-Za-z0-9_-]{20,80}$/.test(saved)) return saved;
  } catch {
    // fall through
  }
  const fresh = memoryToken ?? `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
  memoryToken = fresh;
  try {
    window.localStorage.setItem(TOKEN_KEY, fresh);
  } catch {
    // Convenience only.
  }
  return fresh;
}

type State = "free" | "mine" | "taken";
type Ctx = { ownerId: string; ready: boolean; status: Map<number, State>; set: (id: number, s: State) => void };
const GiftContext = createContext<Ctx | null>(null);

/** Loads what's reserved on this wishlist. Renders nothing extra; without
 * the migration (or for the owner) the buttons simply stay hidden. */
export function GiftProvider({ ownerId, enabled, children }: { ownerId: string; enabled: boolean; children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<Map<number, State>>(new Map());

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getGiftStatus(ownerId, visitorToken())
      .then((rows) => {
        if (cancelled || !rows) return;
        setStatus(new Map(rows.map((r) => [r.tmdbMovieId, r.mine ? "mine" : "taken"])));
        setReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ownerId, enabled]);

  const set = useCallback((id: number, s: State) => {
    setStatus((prev) => {
      const next = new Map(prev);
      if (s === "free") next.delete(id);
      else next.set(id, s);
      return next;
    });
  }, []);

  return <GiftContext.Provider value={{ ownerId, ready, status, set }}>{children}</GiftContext.Provider>;
}

/** "I'm buying this" under a poster on a shared wishlist. */
export function GiftButton({ tmdbMovieId, title }: { tmdbMovieId: number; title: string }) {
  const { t } = useT();
  const ctx = useContext(GiftContext);
  const [pending, start] = useTransition();
  if (!ctx?.ready) return null;
  const state = ctx.status.get(tmdbMovieId) ?? "free";

  if (state === "taken") {
    return (
      <Badge variant="outline" className="self-start gap-1 text-muted-foreground">
        <Gift className="size-3" aria-hidden />
        {t("gift_taken")}
      </Badge>
    );
  }

  if (state === "mine") {
    return (
      <div className="flex flex-col items-start gap-1">
        <Badge variant="success" className="gap-1">
          <Gift className="size-3" aria-hidden />
          {t("gift_mine")}
        </Badge>
        <button
          type="button"
          disabled={pending}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
          aria-label={t("gift_undo_label", title)}
          onClick={() =>
            start(async () => {
              const ok = await unreserveGift(ctx.ownerId, tmdbMovieId, visitorToken()).catch(() => false);
              if (ok) ctx.set(tmdbMovieId, "free");
              else toast.error(t("gift_error"));
            })
          }
        >
          <Undo2 className="size-3" aria-hidden />
          {t("gift_undo")}
        </button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="self-start"
      disabled={pending}
      aria-label={t("gift_reserve_label", title)}
      onClick={() =>
        start(async () => {
          const r = await reserveGift(ctx.ownerId, tmdbMovieId, visitorToken()).catch(() => "failed" as const);
          if (r === "ok") {
            ctx.set(tmdbMovieId, "mine");
            toast.success(t("gift_reserved", title));
          } else if (r === "taken") {
            ctx.set(tmdbMovieId, "taken");
            toast.error(t("gift_taken_now"));
          } else if (r === "limit") toast.error(t("gift_limit"));
          else toast.error(t("gift_error"));
        })
      }
    >
      <Gift className="size-4" aria-hidden />
      {t("gift_reserve")}
    </Button>
  );
}
