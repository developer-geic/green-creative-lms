"use client";

import Link from "next/link";
import type { CatalogTab } from "@/components/catalogs/catalogTabs";

export function CatalogTabNav({
  active,
  tabs,
}: {
  active: CatalogTab;
  tabs: Array<{ id: CatalogTab; label: string }>;
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-border pb-3">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={`/catalogs?tab=${tab.id}`}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            active === tab.id
              ? "bg-primary-soft text-primary-dark"
              : "text-slate-600 hover:bg-muted"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
