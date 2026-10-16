"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Film,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Menu,
  User,
  Info,
  X,
  Users,
  Award,
  ListChecks,
  Rss,
  FileCheck,
  FilePlus,
  Pencil,
  ShieldCheck,
  Flag,
  BarChart3,
  Megaphone,
  ShieldQuestion,
  CalendarDays,
  Bookmark,
  Tags,
  ChevronDown,
  MoreHorizontal,
  TrendingUp,
  Eye,
  MessageSquareText,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale-provider";
import { signOut } from "@/actions/auth";
import type { Profile } from "@/types/database";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/avatar";
import { FeedbackDialog } from "@/components/feedback-dialog";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto min-w-5 rounded-full bg-primary px-1.5 text-center text-[11px] font-semibold leading-5 text-primary-foreground tabular-nums">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
  onNavigate,
  count = 0,
}: {
  href: string;
  icon: typeof Film;
  label: string;
  onNavigate: () => void;
  count?: number;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-elevated text-foreground" : "text-muted-foreground hover:bg-elevated/60 hover:text-foreground",
      )}
    >
      {/* Amber "projector beam" marker on the active item. */}
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-opacity",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
      {label}
      <CountBadge count={count} />
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-3 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">{children}</p>;
}

/** Mobile bottom tab — the four most-used destinations plus "Meer". */
function TabLink({ href, icon: Icon, label }: { href: string; icon: typeof Film; label: string }) {
  const pathname = usePathname();
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}

export function NavShell({
  profile,
  feedbackNewCount = 0,
  children,
}: {
  profile: Profile | null;
  /** New feedback items, shown on the admin menu (admins only, else 0). */
  feedbackNewCount?: number;
  children: React.ReactNode;
}) {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(() => pathname.startsWith("/admin"));
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const close = () => setOpen(false);

  const sidebar = (
    <nav className="flex h-full w-64 flex-col gap-0.5 overflow-y-auto border-r border-border bg-card/80 p-3 backdrop-blur">
      <div className="flex items-center justify-between px-2 pb-4 pt-1">
        <Link href="/dashboard" onClick={close} aria-label={t("app_name")}>
          <Logo markClassName="size-7" />
        </Link>
        <button className="rounded-full p-1 text-muted-foreground hover:bg-elevated md:hidden" onClick={close} aria-label={t("action_cancel")}>
          <X className="h-5 w-5" />
        </button>
      </div>

      <NavLink href="/dashboard" icon={LayoutDashboard} label={t("dashboard_title")} onNavigate={close} />

      <SectionLabel>{t("nav_section_films")}</SectionLabel>
      <NavLink href="/films" icon={Film} label={t("nav_films_series")} onNavigate={close} />
      <NavLink href="/watched" icon={Eye} label={t("nav_watched")} onNavigate={close} />
      <NavLink href="/collections" icon={LibraryBig} label={t("collections_label")} onNavigate={close} />
      <NavLink href="/lists" icon={ListChecks} label={t("nav_lists")} onNavigate={close} />
      <NavLink href="/recap" icon={CalendarDays} label={t("nav_yearly_recap")} onNavigate={close} />
      <NavLink href="/wishlist" icon={Bookmark} label={t("nav_wishlist")} onNavigate={close} />

      <SectionLabel>{t("nav_section_profile")}</SectionLabel>
      <NavLink href="/profile" icon={User} label={t("profile_title")} onNavigate={close} />
      <NavLink href="/friends" icon={Users} label={t("nav_friends")} onNavigate={close} />
      <NavLink href="/badges" icon={Award} label={t("nav_badges")} onNavigate={close} />
      <NavLink href="/feed" icon={Rss} label={t("nav_feed")} onNavigate={close} />

      {profile?.is_admin && (
        <>
          <button
            type="button"
            onClick={() => setAdminOpen((v) => !v)}
            aria-expanded={adminOpen}
            className="flex items-center justify-between px-3 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70 hover:text-foreground"
          >
            {t("nav_section_admin")}
            <span className="flex items-center gap-2">
              {!adminOpen && <CountBadge count={feedbackNewCount} />}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", adminOpen && "rotate-180")} />
            </span>
          </button>
          {adminOpen && (
            <>
              <NavLink href="/admin/pending-barcodes" icon={FileCheck} label={t("pending_approvals_label")} onNavigate={close} />
              <NavLink href="/admin/add-film" icon={FilePlus} label={t("admin_add_film_label")} onNavigate={close} />
              <NavLink href="/admin/manage-films" icon={Pencil} label={t("admin_manage_films_label")} onNavigate={close} />
              <NavLink href="/admin/manage-types" icon={Tags} label={t("admin_manage_types_label")} onNavigate={close} />
              <NavLink href="/admin/users" icon={ShieldCheck} label={t("admin_users_label")} onNavigate={close} />
              <NavLink href="/admin/reports" icon={Flag} label={t("admin_reports_label")} onNavigate={close} />
              <NavLink href="/admin/feedback" icon={Inbox} label={t("admin_feedback_title")} onNavigate={close} count={feedbackNewCount} />
              <NavLink href="/admin/stats" icon={BarChart3} label={t("admin_stats_label")} onNavigate={close} />
              <NavLink href="/admin/growth" icon={TrendingUp} label={t("admin_growth_label")} onNavigate={close} />
              <NavLink href="/admin/announcement" icon={Megaphone} label={t("admin_announcement_label")} onNavigate={close} />
            </>
          )}
        </>
      )}

      <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-3">
        {profile && (
          <Link
            href="/profile"
            onClick={close}
            className="mb-1 flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-elevated/60"
          >
            <Avatar src={profile.avatar_url} name={profile.name} className="size-8" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{profile.name ?? profile.email}</span>
              {profile.name && profile.email && <span className="block truncate text-xs text-muted-foreground">{profile.email}</span>}
            </span>
          </Link>
        )}
        <button
          type="button"
          onClick={() => {
            close();
            setFeedbackOpen(true);
          }}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-elevated/60 hover:text-foreground"
        >
          <MessageSquareText className="h-4 w-4" />
          {t("feedback_nav")}
        </button>
        <NavLink href="/my-feedback" icon={Inbox} label={t("feedback_my_nav")} onNavigate={close} />
        <NavLink href="/privacy" icon={ShieldQuestion} label={t("privacy_policy_link")} onNavigate={close} />
        <NavLink href="/about" icon={Info} label={t("nav_about")} onNavigate={close} />
        <button
          onClick={() => {
            close();
            signOut().then(() => {
              router.replace("/login");
              router.refresh();
            });
          }}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-elevated/60 hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          {t("nav_logout")}
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <div className="sticky top-0 hidden h-screen md:block">{sidebar}</div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0" onClick={close} />
          <div className="absolute inset-y-0 left-0 bg-card animate-in slide-in-from-left duration-200">{sidebar}</div>
        </div>
      )}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/60 bg-background/75 px-4 py-3 backdrop-blur-md md:hidden">
          <button
            onClick={() => setOpen(true)}
            aria-label={t("nav_menu_description")}
            className="-ml-1 rounded-full p-1 text-muted-foreground hover:bg-elevated hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/dashboard" aria-label={t("app_name")}>
            <Logo markClassName="size-6" className="[&>span:last-child]:text-lg" />
          </Link>
          {profile && (
            <Link href="/profile" className="ml-auto" aria-label={t("profile_title")}>
              <Avatar src={profile.avatar_url} name={profile.name} className="size-8" />
            </Link>
          )}
        </header>

        <main className="flex-1 p-4 pb-24 md:p-8">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border/60 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
          <TabLink href="/dashboard" icon={LayoutDashboard} label={t("nav_home")} />
          <TabLink href="/films" icon={Film} label={t("films_label")} />
          <TabLink href="/collections" icon={LibraryBig} label={t("collections_label")} />
          <TabLink href="/wishlist" icon={Bookmark} label={t("nav_wishlist")} />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted-foreground"
          >
            <MoreHorizontal className="h-5 w-5" />
            {t("nav_more")}
          </button>
        </nav>
      </div>
    </div>
  );
}
