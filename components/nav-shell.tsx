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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale-provider";
import { signOut } from "@/actions/auth";
import type { Profile } from "@/types/database";

function NavLink({ href, icon: Icon, label, onNavigate }: { href: string; icon: typeof Film; label: string; onNavigate: () => void }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>;
}

export function NavShell({ profile, children }: { profile: Profile | null; children: React.ReactNode }) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const sidebar = (
    <nav className="flex h-full w-64 flex-col gap-1 overflow-y-auto border-r border-border bg-card p-3">
      <div className="flex items-center justify-between px-1 pb-3">
        <span className="text-lg font-semibold">{t("app_name")}</span>
        <button className="md:hidden" onClick={close} aria-label={t("action_cancel")}>
          <X className="h-5 w-5" />
        </button>
      </div>

      <NavLink href="/dashboard" icon={LayoutDashboard} label={t("dashboard_title")} onNavigate={close} />

      <SectionLabel>{t("nav_section_films")}</SectionLabel>
      <NavLink href="/films" icon={Film} label={t("films_label")} onNavigate={close} />
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
          <SectionLabel>{t("nav_section_admin")}</SectionLabel>
          <NavLink href="/admin/pending-barcodes" icon={FileCheck} label={t("pending_approvals_label")} onNavigate={close} />
          <NavLink href="/admin/add-film" icon={FilePlus} label={t("admin_add_film_label")} onNavigate={close} />
          <NavLink href="/admin/manage-films" icon={Pencil} label={t("admin_manage_films_label")} onNavigate={close} />
          <NavLink href="/admin/manage-types" icon={Tags} label={t("admin_manage_types_label")} onNavigate={close} />
          <NavLink href="/admin/users" icon={ShieldCheck} label={t("admin_users_label")} onNavigate={close} />
          <NavLink href="/admin/reports" icon={Flag} label={t("admin_reports_label")} onNavigate={close} />
          <NavLink href="/admin/stats" icon={BarChart3} label={t("admin_stats_label")} onNavigate={close} />
          <NavLink href="/admin/announcement" icon={Megaphone} label={t("admin_announcement_label")} onNavigate={close} />
        </>
      )}

      <div className="mt-auto flex flex-col gap-1 pt-4">
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
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted"
        >
          <LogOut className="h-4 w-4" />
          {t("nav_logout")}
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <div className="hidden md:block">{sidebar}</div>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="absolute inset-y-0 left-0">{sidebar}</div>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
          <button onClick={() => setOpen(true)} aria-label={t("nav_menu_description")}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold">{t("app_name")}</span>
          {profile?.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="ml-auto h-7 w-7 rounded-full object-cover" />
          )}
        </header>
        <main className="flex-1 bg-background p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
