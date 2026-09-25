import type { CatalogPermissions } from "@/types/lms";

export type CatalogTab = "programs" | "courses" | "statuses" | "absorption";

const TAB_PERMS: Array<{
  id: CatalogTab;
  label: string;
  flag?: keyof CatalogPermissions;
  viewCode: string;
}> = [
  { id: "programs", label: "Chương trình", flag: "manage_programs", viewCode: "programs.view" },
  { id: "courses", label: "Khóa học", flag: "manage_courses", viewCode: "courses.view" },
  {
    id: "statuses",
    label: "Trạng thái HV",
    flag: "manage_student_statuses",
    viewCode: "student_statuses.view",
  },
  {
    id: "absorption",
    label: "Mức tiếp thu",
    flag: "manage_absorption_levels",
    viewCode: "absorption_levels.view",
  },
];

export function catalogTabsForPermissions(
  isAdmin: boolean,
  perms?: CatalogPermissions | null,
  can?: (code: string) => boolean,
): Array<{ id: CatalogTab; label: string }> {
  if (isAdmin) {
    return TAB_PERMS.map(({ id, label }) => ({ id, label }));
  }

  return TAB_PERMS.filter((t) => {
    if (can?.(t.viewCode) || can?.(`${t.viewCode.replace(".view", "")}.create`)) {
      return true;
    }
    return t.flag ? Boolean(perms?.[t.flag]) : false;
  }).map(({ id, label }) => ({ id, label }));
}

export function canAccessCatalogs(
  isAdmin: boolean,
  perms?: CatalogPermissions | null,
  can?: (code: string) => boolean,
) {
  if (can?.("catalogs.view")) return true;
  return catalogTabsForPermissions(isAdmin, perms, can).length > 0;
}

export function catalogActionCodes(tab: CatalogTab): {
  create: string;
  update: string;
  delete: string;
} {
  const resource =
    tab === "statuses"
      ? "student_statuses"
      : tab === "absorption"
        ? "absorption_levels"
        : tab;
  return {
    create: `${resource}.create`,
    update: `${resource}.update`,
    delete: `${resource}.delete`,
  };
}
