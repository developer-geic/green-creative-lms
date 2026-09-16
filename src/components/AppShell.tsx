"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Bell,
  BookOpen,
  CalendarCheck,
  ChartColumn,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Search,
  Settings,
  Upload,
  Users,
  UserCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { lmsApi } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/classes", label: "Lớp học", icon: BookOpen },
  { href: "/students", label: "Học viên", icon: GraduationCap },
  { href: "/attendance", label: "Điểm danh", icon: CalendarCheck },
  { href: "/progress", label: "Tiến độ", icon: ClipboardList },
  { href: "/assessments", label: "Đánh giá", icon: ClipboardList },
  { href: "/reports", label: "Tra cứu HV", icon: Search },
  { href: "/announcements", label: "Thông báo", icon: Bell },
  { href: "/profile", label: "Hồ sơ cá nhân", icon: UserCircle },
];

const ADMIN_NAV = [
  { href: "/stats", label: "Thống kê", icon: ChartColumn },
  { href: "/users", label: "Người dùng", icon: Users },
  { href: "/import", label: "Import Excel", icon: Upload },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    lmsApi
      .unreadCount()
      .then((res) => setUnread(res.data?.count || 0))
      .catch(() => setUnread(0));
  }, [pathname]);

  const items = role === "admin" ? [...NAV, ...ADMIN_NAV] : NAV;

  return (
    <div className="flex min-h-screen bg-muted">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-white">
        <div className="border-b border-border px-4 py-5">
          <div className="text-sm font-semibold text-primary-dark">Sáng Tạo Xanh</div>
          <div className="text-xs text-slate-500">LMS nội bộ</div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-primary-soft hover:text-primary-dark",
                  active && "bg-primary-soft text-primary-dark",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.href === "/announcements" && unread > 0 && (
                  <span className="rounded-full bg-danger px-1.5 text-[10px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <div className="mb-2 truncate px-2 text-xs text-slate-500">
            {(session?.user as any)?.name || (session?.user as any)?.email}
          </div>
          <button
            className="btn btn-ghost w-full"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <Settings className="h-4 w-4" /> Đăng xuất
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
