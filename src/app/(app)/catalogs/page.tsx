"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { CatalogTabNav } from "@/components/catalogs/CatalogTabNav";
import {
  canAccessCatalogs,
  catalogTabsForPermissions,
  type CatalogTab,
} from "@/components/catalogs/catalogTabs";
import { useCatalog } from "@/hooks/useCatalog";
import { lmsApi } from "@/lib/api";
import type { CatalogPermissions } from "@/types/lms";

const CatalogCrudPanel = dynamic(
  () =>
    import("@/components/catalogs/CatalogCrudPanel").then((m) => m.CatalogCrudPanel),
  { loading: () => <PanelSkeleton /> },
);

function PanelSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded bg-muted" />
      ))}
    </div>
  );
}

function CatalogsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";
  const [perms, setPerms] = useState<CatalogPermissions | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([lmsApi.me()])
      .then(([me]) => {
        const flags = me.data?.user?.catalog_permissions || null;
        setPerms(flags);
        setReady(true);
        if (!canAccessCatalogs(isAdmin, flags)) {
          toast.error("Bạn không có quyền quản lý danh mục");
          router.replace("/dashboard");
        }
      })
      .catch((e) => {
        toast.error(e.message);
        setReady(true);
      });
  }, [isAdmin, router]);

  const tabs = useMemo(
    () => catalogTabsForPermissions(isAdmin, perms),
    [isAdmin, perms],
  );

  const tabParam = searchParams.get("tab") as CatalogTab | null;
  const active: CatalogTab =
    tabParam && tabs.some((t) => t.id === tabParam)
      ? tabParam
      : tabs[0]?.id || "programs";

  const programs = useCatalog("programs", {
    includeInactive: true,
    enabled: ready && (active === "programs" || active === "courses"),
  });
  const courses = useCatalog("courses", {
    includeInactive: true,
    enabled: ready && active === "courses",
  });
  const statuses = useCatalog("student-statuses", {
    includeInactive: true,
    enabled: ready && active === "statuses",
  });
  const absorption = useCatalog("absorption-levels", {
    includeInactive: true,
    enabled: ready && active === "absorption",
  });

  if (!ready) {
    return <PanelSkeleton />;
  }

  if (!tabs.length) {
    return <p className="text-sm text-slate-500">Không có quyền truy cập danh mục.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-primary-dark">Danh mục</h1>
        <p className="text-sm text-slate-500">
          Quản lý chương trình, khóa học, trạng thái học viên và mức tiếp thu.
        </p>
      </div>

      <CatalogTabNav active={active} tabs={tabs} />

      {active === "programs" && (
        <CatalogCrudPanel
          mode="programs"
          items={programs.items}
          loading={programs.loading}
          onChanged={programs.reload}
        />
      )}
      {active === "courses" && (
        <CatalogCrudPanel
          mode="courses"
          items={courses.items}
          loading={courses.loading}
          programs={programs.items}
          onChanged={courses.reload}
        />
      )}
      {active === "statuses" && (
        <CatalogCrudPanel
          mode="statuses"
          items={statuses.items}
          loading={statuses.loading}
          onChanged={statuses.reload}
        />
      )}
      {active === "absorption" && (
        <CatalogCrudPanel
          mode="absorption"
          items={absorption.items}
          loading={absorption.loading}
          onChanged={absorption.reload}
        />
      )}
    </div>
  );
}

export default function CatalogsPage() {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <CatalogsContent />
    </Suspense>
  );
}
