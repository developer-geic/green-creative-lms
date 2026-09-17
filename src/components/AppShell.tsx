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
  Search,
  ShieldCheck,
  Upload,
  Users,
  UserCircle,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { canAccessCatalogs } from "@/components/catalogs/catalogTabs";
import { cn } from "@/lib/utils";
import { lmsApi } from "@/lib/api";
import type { CatalogPermissions } from "@/types/lms";

const TEACHER_NAV = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/classes", label: "Lớp học", icon: BookOpen },
  { href: "/attendance", label: "Điểm danh", icon: CalendarCheck },
  { href: "/progress", label: "Tiến độ & Đánh giá", icon: ClipboardList },
  { href: "/students", label: "Học viên & Tra cứu", icon: GraduationCap },
] as const;

const ADMIN_NAV = [
  { href: "/users", label: "Quản trị Người dùng", icon: Users },
  { href: "/stats", label: "Thống kê & Báo cáo", icon: ChartColumn },
  { href: "/import", label: "Import Excel", icon: Upload },
] as const;

const BOTTOM_NAV = [
  { href: "/announcements", label: "Thông báo", icon: Bell },
  { href: "/profile", label: "Cài đặt & Hồ sơ", icon: UserCircle },
] as const;

function NavItem({
  href,
  label,
  icon: Icon,
  pathname,
  badge,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  pathname: string;
  badge?: number;
}) {
  const active = pathname === href || pathname.startsWith(href + "/");
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
  const [catalogPerms, setCatalogPerms] = useState<CatalogPermissions | null>(null);
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      lmsApi.unreadCount().catch(() => ({ data: { count: 0 } })),
      lmsApi.me().catch(() => null),
    ]).then(([unreadRes, meRes]) => {
      startTransition(() => {
        setUnread(unreadRes.data?.count || 0);
        setCatalogPerms(meRes?.data?.user?.catalog_permissions || null);
      });
    });
  }, [pathname]);

  const showCatalogs = canAccessCatalogs(isAdmin, catalogPerms);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed left-0 top-0 z-50 flex h-full w-64 flex-col justify-between bg-surface shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col overflow-hidden">
          <div className="flex h-16 items-center gap-2 px-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-on-primary">
              ST
            </div>
            <div className="flex flex-col">
              <span className="text-base font-semibold leading-tight text-primary">Sáng Tạo Xanh</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Enterprise LMS
              </span>
            </div>
          </div>

          <div className="px-4 pb-1 pt-2">
            <div className="flex items-center justify-between rounded-lg bg-surface-low p-1">
              <div className="flex items-center gap-1.5 px-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-semibold text-foreground">
                  {isAdmin ? "Admin / Giáo viên" : "Giáo viên"}
                </span>
              </div>
              <span className="rounded p-1 text-on-surface-variant" title="Vai trò hiện tại">
                <ArrowLeftRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>

          <nav className="flex max-h-[calc(100vh-140px)] flex-col gap-1 overflow-y-auto px-4 py-2">
            {TEACHER_NAV.map((item) => (
              <NavItem key={item.href} {...item} pathname={pathname} />
            ))}
            {showCatalogs || isAdmin ? <div className="mx-2 my-1 h-px bg-surface-high" /> : null}
            {showCatalogs ? (
              <NavItem href="/catalogs" label="Danh mục" icon={Library} pathname={pathname} />
            ) : null}
            {isAdmin
              ? ADMIN_NAV.map((item) => (
                  <NavItem key={item.href} {...item} pathname={pathname} />
                ))
              : null}
            {BOTTOM_NAV.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                pathname={pathname}
                badge={item.href === "/announcements" ? unread : undefined}
              />
            ))}
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
                  {isAdmin ? "Ban Đào Tạo" : "Giảng viên"}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="rounded p-1 text-on-surface-variant transition-colors hover:text-foreground"
              title="Đăng xuất"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col pl-64">
        <header className="fixed left-64 right-0 top-0 z-40 flex h-16 items-center justify-between bg-surface/90 px-6 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
          <div className="flex max-w-xl flex-1 items-center gap-4">
            <div className="hidden items-center gap-1 text-xs font-semibold text-on-surface-variant sm:flex">
              <span>LMS</span>
              <span className="text-outline">/</span>
              <span className="text-foreground">Hệ thống Quản trị</span>
            </div>
            <form
              className="relative max-w-sm flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                if (search.trim()) {
                  window.location.href = `/reports?q=${encodeURIComponent(search.trim())}`;
                }
              }}
            >
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
              <input
                className="input h-10 pl-9"
                type="search"
                placeholder="Tra cứu nhanh mã lớp, học viên, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 rounded-full bg-surface-high px-3 py-1">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              <span className="text-[11px] font-semibold text-foreground">
                {isAdmin ? "Admin / Giảng viên" : "Giảng viên"}
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
                  {isAdmin ? "Giáo viên / Quản trị viên" : "Giáo viên"}
                </span>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-on-primary">
                {userName.slice(0, 1).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="w-full flex-1 bg-background px-6 pb-6 pt-20">{children}</main>
      </div>
    </div>
  );
}
