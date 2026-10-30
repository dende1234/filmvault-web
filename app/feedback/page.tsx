import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/brand/logo";
import { FeedbackForm } from "@/components/feedback-form";

export const metadata = { title: "Feedback" };

/** Public feedback page: reachable signed in or not (proxy
 * ALWAYS_ACCESSIBLE_PATHS), so visitors who get stuck at sign-up can still
 * tell us. Signed-in users get the screenshot option and a link to their list. */
export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const dict = getDictionary(await getLocale());
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { from } = await searchParams;
  // Only accept an internal path as "where it happened".
  const page = from && from.startsWith("/") && !from.startsWith("//") ? from.slice(0, 300) : undefined;

  return (
    <div className="bg-cinema min-h-screen">
      <div className="mx-auto flex max-w-xl flex-col gap-8 px-4 py-12">
        <Link href={user ? "/dashboard" : "/"} className="w-fit">
          <Logo markClassName="size-7" />
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-balance">{dict.feedback_title}</h1>
          <p className="text-muted-foreground">{dict.feedback_intro}</p>
        </div>
        <div className="rounded-card border border-border/70 bg-card/80 p-5 shadow-2xl shadow-black/30 backdrop-blur sm:p-7">
          <FeedbackForm signedIn={!!user} page={page} />
        </div>
        {user && (
          <Link href="/my-feedback" className="w-fit text-sm text-muted-foreground hover:text-foreground hover:underline">
            {dict.feedback_my_nav} →
          </Link>
        )}
      </div>
    </div>
  );
}
