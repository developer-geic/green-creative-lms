"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  ArrowLeftRight,
  Bell,
  BookOpen,
  CalendarCheck,
  ChartColumn,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  ShieldCheck,
  Upload,
  Users,
  UserCircle,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { SearchField } from "@/components/SearchField";
import { invalidateMeCache } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { lmsApi } from "@/lib/api";
import type { LmsMenuItem } from "@/types/lms";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  BookOpen,
  Library,
  ShieldCheck,
  Users,
  ChartColumn,
  Upload,
  Bell,
  UserCircle,
};

const FALLBACK_SIDEBAR: LmsMenuItem[] = [
  { id: 1, label: "Tổng quan", href: "/dashboard", icon: "LayoutDashboard", placement: "sidebar", sort_order: 10 },
  { id: 2, label: "Điểm danh", href: "/attendance", icon: "CalendarCheck", placement: "sidebar", sort_order: 20 },
  {
    id: 3,
    label: "Tiến độ & Đánh giá",
    href: "/progress",
    icon: "ClipboardList",
    placement: "sidebar",
    sort_order: 30,
    also_active_for: ["/assessments"],
  },
  { id: 4, label: "Tra cứu học viên", href: "/students", icon: "GraduationCap", placement: "sidebar", sort_order: 40 },
];

const FALLBACK_BOTTOM: LmsMenuItem[] = [
  { id: 10, label: "Thông báo", href: "/announcements", icon: "Bell", placement: "bottom", sort_order: 10 },
  { id: 11, label: "Cài đặt & Hồ sơ", href: "/profile", icon: "UserCircle", placement: "bottom", sort_order: 20 },
];

function NavItem({
  href,
  label,
  icon: Icon,
  pathname,
  badge,
  alsoActiveFor,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  pathname: string;
  badge?: number;
  alsoActiveFor?: readonly string[];
}) {
  const active =
    pathname === href ||
    pathname.startsWith(href + "/") ||
    (alsoActiveFor || []).some(
      (p) => pathname === p || pathname.startsWith(p + "/"),
    );
  return (
    <Link href={href} className={cn("nav-link", active && "nav-link-active")}>
      <Icon className="h-5 w-5 shrink-0" />
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 ? (
        <span className="rounded-full bg-danger-container px-1.5 py-0.5 text-[11px] font-semibold text-[#93000a]">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string; name?: string; email?: string } | undefined)?.role;
  const isAdmin = role === "admin";
  const userName =
    (session?.user as { name?: string } | undefined)?.name ||
    (session?.user as { email?: string } | undefined)?.email ||
    "Người dùng";
  const [unread, setUnread] = useState(0);
  const [menus, setMenus] = useState<LmsMenuItem[]>([]);
  const [roleLabel, setRoleLabel] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      lmsApi.unreadCount().catch(() => ({ data: { count: 0 } })),
      lmsApi.me().catch(() => null),
    ]).then(([unreadRes, meRes]) => {
      startTransition(() => {
        setUnread(unreadRes.data?.count || 0);
        const list = (meRes?.data?.menus as LmsMenuItem[]) || [];
        setMenus(list);
        setRoleLabel(meRes?.data?.user?.role_detail?.name || null);
      });
    });
  }, [pathname]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileNavOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  const { sidebar, bottom } = useMemo(() => {
    const source = menus.length ? menus : [...FALLBACK_SIDEBAR, ...FALLBACK_BOTTOM];
    return {
      sidebar: source
        .filter((m) => m.placement !== "bottom")
        .sort((a, b) => a.sort_order - b.sort_order),
      bottom: source
        .filter((m) => m.placement === "bottom")
        .sort((a, b) => a.sort_order - b.sort_order),
    };
  }, [menus]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Đóng menu"
          className="fixed inset-0 z-40 bg-[#213145]/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-64 flex-col justify-between bg-surface shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-transform duration-200 ease-out",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0",
        )}
      >
        <div className="flex flex-col overflow-hidden">
          <div className="flex h-16 items-center justify-between gap-2 px-4 md:px-6">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo.jpg"
                alt="Sáng Tạo Xanh"
                className="h-9 w-9 shrink-0 rounded-lg object-contain"
              />
              <div className="flex flex-col">
                <span className="text-base font-semibold leading-tight text-primary">
                  Sáng Tạo Xanh
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Enterprise LMS
                </span>
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-low md:hidden"
              aria-label="Đóng menu"
              onClick={() => setMobileNavOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-4 pb-1 pt-2">
            <div className="flex items-center justify-between rounded-lg bg-surface-low p-1">
              <div className="flex items-center gap-1.5 px-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-semibold text-foreground">
                  {isAdmin ? "Admin" : roleLabel || "Giáo viên"}
                </span>
              </div>
              <span className="rounded p-1 text-on-surface-variant" title="Vai trò hiện tại">
                <ArrowLeftRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>

          <nav className="flex max-h-[calc(100vh-140px)] flex-col gap-1 overflow-y-auto px-4 py-2">
            {sidebar.map((item) => {
              const Icon = ICON_MAP[item.icon || ""] || LayoutDashboard;
              return (
                <NavItem
                  key={`${item.id}-${item.href}`}
                  href={item.href}
                  label={item.label}
                  icon={Icon}
                  pathname={pathname}
                  alsoActiveFor={item.also_active_for}
                />
              );
            })}
            {bottom.length ? <div className="mx-2 my-1 h-px bg-surface-high" /> : null}
            {bottom.map((item) => {
              const Icon = ICON_MAP[item.icon || ""] || Bell;
              return (
                <NavItem
                  key={`${item.id}-${item.href}`}
                  href={item.href}
                  label={item.label}
                  icon={Icon}
                  pathname={pathname}
                  badge={item.href === "/announcements" ? unread : undefined}
                  alsoActiveFor={item.also_active_for}
                />
              );
            })}
          </nav>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between rounded-lg bg-surface-low p-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-on-primary">
                {userName.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-xs font-semibold text-foreground">{userName}</span>
                <span className="text-[11px] text-on-surface-variant">
                  {isAdmin ? "Ban Đào Tạo" : roleLabel || "Giảng viên"}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="rounded p-1 text-on-surface-variant transition-colors hover:text-foreground"
              title="Đăng xuất"
              onClick={() => {
                invalidateMeCache();
                signOut({ callbackUrl: "/login" });
              }}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col pl-0 md:pl-64">
        <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between gap-2 bg-surface/90 px-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl md:left-64 md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-4">
            <button
              type="button"
              className="shrink-0 rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-low md:hidden"
              aria-label="Mở menu"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden items-center gap-1 text-xs font-semibold text-on-surface-variant sm:flex">
              <span>LMS</span>
              <span className="text-outline">/</span>
              <span className="text-foreground">Hệ thống Quản trị</span>
            </div>
            <form
              className="min-w-0 max-w-sm flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                if (search.trim()) {
                  window.location.href = `/students?q=${encodeURIComponent(search.trim())}`;
                }
              }}
            >
              <SearchField
                placeholder="Tra cứu lớp, HV..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
                wrapperClassName="w-full"
              />
            </form>
          </div>
          <div className="flex shrink-0 items-center gap-2 md:gap-4">
            <div className="hidden items-center gap-1.5 rounded-full bg-surface-high px-3 py-1 sm:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              <span className="text-[11px] font-semibold text-foreground">
                {isAdmin ? "Admin / Giảng viên" : roleLabel || "Giảng viên"}
              </span>
            </div>
            <Link
              href="/announcements"
              className="relative rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-low hover:text-foreground"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 ? (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger ring-2 ring-surface" />
              ) : null}
            </Link>
            <div className="hidden h-6 w-px bg-surface-high lg:block" />
            <div className="flex items-center gap-2">
              <div className="hidden flex-col text-right lg:flex">
                <span className="text-xs font-semibold text-foreground">{userName}</span>
                <span className="text-[11px] font-medium text-primary">
                  {isAdmin ? "Giáo viên / Quản trị viên" : roleLabel || "Giáo viên"}
                </span>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-on-primary">
                {userName.slice(0, 1).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="w-full flex-1 bg-background px-4 pb-6 pt-20 md:px-6">{children}</main>
      </div>
    </div>
  );
}
