"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ClipboardCheck, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/progress", label: "Tiến độ BTVN", icon: ClipboardList },
  { href: "/assessments", label: "Đánh giá học viên", icon: ClipboardCheck },
] as const;

export function ProgressAssessTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const preserved = new URLSearchParams();
  for (const key of ["class_id", "year", "month"] as const) {
    const v = searchParams.get(key);
    if (v) preserved.set(key, v);
  }
  const qs = preserved.toString();
  const suffix = qs ? `?${qs}` : "";

  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-surface-low p-1">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={`${href}${suffix}`}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-surface text-primary-dark shadow-sm"
                : "text-on-surface-variant hover:bg-surface/70 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
