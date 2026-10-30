"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, EyeOff, Lightbulb, MessageCircle, SendHorizontal, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { HELP_ENTRIES } from "@/lib/help/faq";
import { entriesForPage, matchHelp, type HelpEntry, type Lang } from "@/lib/help/match";
import { getHelpAnswerEntries, logHelpQuestion, rateHelpQuestion } from "@/actions/help";
import type { FeedbackKind } from "@/types/database";
import { cn } from "@/lib/utils";
import { FeedbackForm } from "@/components/feedback-form";
import { Button } from "@/components/ui/button";
import { ReelMascot } from "@/components/help/reel-mascot";

/** Asked when the page has no entries of its own. */
const POPULAR = ["add-film", "scan-barcode", "import-csv", "share-collection"];
/** Pages with their own sticky action bar at the bottom: no floating Reel there
 * (the panel still opens from the menu). */
const QUIET_PATHS = ["/scannen", "/collections/import"];
const BUBBLE_SEEN_KEY = "fv_reel_bubble_seen"; // sessionStorage: once per session
const BUBBLE_OFF_KEY = "fv_reel_bubble_off"; // localStorage: "don't show again"

type Message =
  | { id: number; from: "user"; text: string }
  | { id: number; from: "reel"; type: "answer"; entry: HelpEntry; also: HelpEntry[]; question: string; logId: string | null; rated?: boolean }
  | { id: number; from: "reel"; type: "none"; question: string };

type FeedbackDraft = { message: string; kind: FeedbackKind };

function store(kind: "local" | "session") {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/** **bold** and [label](/path) in the knowledge-base answers. */
function RichText({ text, onNavigate }: { text: string; onNavigate: () => void }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((part, i) => {
        const bold = part.match(/^\*\*([^*]+)\*\*$/);
        if (bold) return <strong key={i} className="font-semibold">{bold[1]}</strong>;
        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link && link[2].startsWith("/"))
          return (
            <Link key={i} href={link[2]} onClick={onNavigate} className="font-medium text-primary underline-offset-2 hover:underline">
              {link[1]}
            </Link>
          );
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

/** Reel: the help mascot (bottom right) and its chat-like panel. Answers come
 * from the fixed knowledge base in lib/help/faq.ts, no AI. When there's no
 * answer, the answer didn't help, or it can't be done yet, the question goes
 * straight into the feedback form. Typed questions are logged anonymously. */
export function ReelAssistant({
  open,
  onOpenChange,
  hidden,
  onHide,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Hidden by the user: no floating mascot (the menu item still opens the panel). */
  hidden: boolean;
  onHide: () => void;
}) {
  const { t, locale } = useT();
  const lang: Lang = locale === "en" ? "en" : "nl";
  const pathname = usePathname();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<FeedbackDraft | null>(null);
  const [bubble, setBubble] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const nextId = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Answers admins added (help_answers.sql), loaded the first time Reel opens.
  const [extra, setExtra] = useState<HelpEntry[] | null>(null);
  const entries = useMemo(() => (extra?.length ? [...HELP_ENTRIES, ...extra] : HELP_ENTRIES), [extra]);

  useEffect(() => {
    if (!open || extra !== null) return;
    let cancelled = false;
    getHelpAnswerEntries()
      .catch(() => [])
      .then((list) => !cancelled && setExtra(list));
    return () => {
      cancelled = true;
    };
  }, [open, extra]);

  // Greeting bubble: once per session, until "don't show again".
  useEffect(() => {
    if (hidden || open) return;
    if (store("local")?.getItem(BUBBLE_OFF_KEY) || store("session")?.getItem(BUBBLE_SEEN_KEY)) return;
    const timer = setTimeout(() => {
      setBubble(true);
      store("session")?.setItem(BUBBLE_SEEN_KEY, "1");
    }, 1500);
    return () => clearTimeout(timer);
  }, [hidden, open]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, feedback]);

  const id = () => nextId.current++;
  const close = () => {
    setBubble(false);
    onOpenChange(false);
  };
  const openPanel = () => {
    setBubble(false);
    onOpenChange(true);
  };
  // For the feedback bot check: the conversation started at the first question.
  const started = () => setStartedAt((s) => s || Date.now());

  function showEntry(entry: HelpEntry, question: string) {
    started();
    setMessages((m) => [
      ...m,
      { id: id(), from: "user", text: entry.q[lang] },
      { id: id(), from: "reel", type: "answer", entry, also: [], question, logId: null },
    ]);
  }

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question) return;
    started();
    setInput("");
    const matches = matchHelp(question, entries, pathname);
    const best = matches[0]?.entry ?? null;
    const answerId = id();
    setMessages((m) => [
      ...m,
      { id: id(), from: "user", text: question },
      best
        ? { id: answerId, from: "reel", type: "answer", entry: best, also: matches.slice(1).map((x) => x.entry), question, logId: null }
        : { id: answerId, from: "reel", type: "none", question },
    ]);
    const logId = await logHelpQuestion({ question, matchedId: best?.id ?? null, locale, page: pathname }).catch(() => null);
    if (logId) setMessages((m) => m.map((msg) => (msg.id === answerId && msg.from === "reel" && msg.type === "answer" ? { ...msg, logId } : msg)));
  }

  function rate(msg: Extract<Message, { type: "answer" }>, helpful: boolean) {
    setMessages((m) => m.map((x) => (x.id === msg.id ? { ...msg, rated: true } : x)));
    if (msg.logId) rateHelpQuestion(msg.logId, helpful).catch(() => {});
    if (!helpful) setFeedback({ message: msg.question, kind: msg.entry.possible ? "other" : "idea" });
  }

  const suggestions = (() => {
    const forPage = entriesForPage(entries, pathname);
    return forPage.length > 0
      ? { title: t("reel_page_help"), entries: forPage }
      : { title: t("reel_popular"), entries: HELP_ENTRIES.filter((e) => POPULAR.includes(e.id)) };
  })();

  const quiet = QUIET_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  return (
    <>
      {!hidden && !open && !quiet && (
        <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2 md:bottom-6 md:right-6">
          {bubble && (
            <div className="relative max-w-60 rounded-2xl rounded-br-sm border border-border bg-card px-4 py-3 text-sm shadow-lg animate-in fade-in-0 slide-in-from-bottom-2">
              <button
                type="button"
                onClick={() => setBubble(false)}
                className="absolute right-1.5 top-1.5 rounded-full p-1 text-muted-foreground hover:bg-elevated hover:text-foreground"
                aria-label={t("reel_close")}
              >
                <X className="size-3.5" />
              </button>
              <button type="button" onClick={openPanel} className="pr-4 text-left">
                {t("reel_bubble")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setBubble(false);
                  store("local")?.setItem(BUBBLE_OFF_KEY, "1");
                }}
                className="mt-1.5 block text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                {t("reel_bubble_off")}
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={openPanel}
            aria-label={t("reel_open")}
            className="rounded-full p-1 drop-shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ReelMascot animated className="size-14" />
          </button>
        </div>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in-0 md:hidden" onClick={close} />
          <section
            role="dialog"
            aria-labelledby="reel-title"
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-4 md:inset-x-auto md:bottom-6 md:right-6 md:max-h-[min(640px,calc(100vh-3rem))] md:w-[400px] md:rounded-2xl"
          >
            <header className="flex items-center gap-3 border-b border-border px-4 py-3">
              {feedback ? (
                <button
                  type="button"
                  onClick={() => setFeedback(null)}
                  className="-ml-1 rounded-full p-1 text-muted-foreground hover:bg-elevated hover:text-foreground"
                  aria-label={t("reel_back")}
                >
                  <ArrowLeft className="size-5" />
                </button>
              ) : (
                <ReelMascot className="size-9 shrink-0" />
              )}
              <h2 id="reel-title" className="min-w-0 flex-1 truncate font-display text-lg font-semibold tracking-tight">
                {feedback ? t("reel_feedback_title") : t("reel_title")}
              </h2>
              {!feedback && !hidden && (
                <button
                  type="button"
                  onClick={() => {
                    onHide();
                    close();
                  }}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-elevated hover:text-foreground"
                  aria-label={t("reel_hide")}
                  title={t("reel_hide")}
                >
                  <EyeOff className="size-4" />
                </button>
              )}
              <button type="button" onClick={close} className="rounded-full p-1.5 text-muted-foreground hover:bg-elevated hover:text-foreground" aria-label={t("reel_close")}>
                <X className="size-5" />
              </button>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
              {feedback ? (
                <FeedbackForm
                  key={feedback.message + feedback.kind}
                  signedIn
                  page={pathname}
                  initialMessage={feedback.message}
                  initialKind={feedback.kind}
                  startedAt={startedAt}
                  onCancel={() => setFeedback(null)}
                />
              ) : (
                <div className="flex flex-col gap-3">
                  <ReelBubble>{t("reel_greeting")}</ReelBubble>
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{suggestions.title}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.entries.map((e) => (
                        <Chip key={e.id} onClick={() => showEntry(e, e.q[lang])}>
                          {e.q[lang]}
                        </Chip>
                      ))}
                    </div>
                  </div>

                  {messages.map((msg) =>
                    msg.from === "user" ? (
                      <p key={msg.id} className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                        {msg.text}
                      </p>
                    ) : msg.type === "none" ? (
                      <ReelBubble key={msg.id}>
                        <p>{t("reel_no_answer")}</p>
                        <p className="mt-1 text-muted-foreground">{t("reel_no_answer_offer")}</p>
                        <Button size="sm" className="mt-2.5" onClick={() => setFeedback({ message: msg.question, kind: "idea" })}>
                          <MessageCircle />
                          {t("reel_send_feedback")}
                        </Button>
                      </ReelBubble>
                    ) : (
                      <ReelBubble key={msg.id}>
                        <p>
                          <RichText text={msg.entry.a[lang]} onNavigate={close} />
                        </p>
                        {!msg.entry.possible && (
                          <>
                            <p className="mt-2 text-muted-foreground">{t("reel_not_possible_offer")}</p>
                            <Button size="sm" className="mt-2" onClick={() => setFeedback({ message: msg.question, kind: "idea" })}>
                              <Lightbulb />
                              {t("reel_suggest_idea")}
                            </Button>
                          </>
                        )}
                        {msg.also.length > 0 && (
                          <div className="mt-3 flex flex-col gap-1.5">
                            <p className="text-xs text-muted-foreground">{t("reel_also")}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.also.map((e) => (
                                <Chip key={e.id} onClick={() => showEntry(e, msg.question)}>
                                  {e.q[lang]}
                                </Chip>
                              ))}
                            </div>
                          </div>
                        )}
                        {msg.entry.possible && (
                          <div className="mt-3 flex items-center gap-1 border-t border-border/60 pt-2 text-xs text-muted-foreground">
                            {msg.rated ? (
                              <span>{t("reel_thanks")}</span>
                            ) : (
                              <>
                                <span className="mr-1">{t("reel_helpful")}</span>
                                <button type="button" onClick={() => rate(msg, true)} className="flex items-center gap-1 rounded-full px-2 py-1 hover:bg-elevated hover:text-foreground">
                                  <ThumbsUp className="size-3.5" />
                                  {t("reel_yes")}
                                </button>
                                <button type="button" onClick={() => rate(msg, false)} className="flex items-center gap-1 rounded-full px-2 py-1 hover:bg-elevated hover:text-foreground">
                                  <ThumbsDown className="size-3.5" />
                                  {t("reel_no")}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </ReelBubble>
                    ),
                  )}
                </div>
              )}
            </div>

            {!feedback && (
              <form onSubmit={ask} className="flex flex-col gap-1.5 border-t border-border px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    maxLength={300}
                    placeholder={t("reel_placeholder")}
                    aria-label={t("reel_placeholder")}
                    className="h-10 min-w-0 flex-1 rounded-full border border-input bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/40 md:text-sm"
                  />
                  <Button type="submit" size="icon" className="shrink-0 rounded-full" disabled={!input.trim()} aria-label={t("reel_send")}>
                    <SendHorizontal />
                  </Button>
                </div>
                <p className="px-2 text-[11px] text-muted-foreground">{t("reel_privacy_note")}</p>
              </form>
            )}
          </section>
        </>
      )}
    </>
  );
}

function ReelBubble({ children }: { children: React.ReactNode }) {
  return <div className="mr-auto max-w-[90%] rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2.5 text-sm leading-relaxed">{children}</div>;
}

function Chip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("rounded-full border border-border bg-background px-3 py-1.5 text-left text-xs transition-colors hover:border-primary/50 hover:text-foreground")}
    >
      {children}
    </button>
  );
}
