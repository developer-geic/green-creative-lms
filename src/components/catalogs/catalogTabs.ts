import type { CatalogPermissions } from "@/types/lms";

export type CatalogTab = "programs" | "courses" | "students" | "statuses" | "absorption";

export function catalogTabsForPermissions(
  isAdmin: boolean,
  perms?: CatalogPermissions | null,
): Array<{ id: CatalogTab; label: string }> {
  const all: Array<{ id: CatalogTab; label: string; flag?: keyof CatalogPermissions }> = [
    { id: "programs", label: "Chương trình", flag: "manage_programs" },
    { id: "courses", label: "Khóa học", flag: "manage_courses" },
    { id: "students", label: "Học viên", flag: "manage_students" },
    { id: "statuses", label: "Trạng thái HV", flag: "manage_student_statuses" },
    { id: "absorption", label: "Mức tiếp thu", flag: "manage_absorption_levels" },
  ];

  if (isAdmin) {
    return all.map(({ id, label }) => ({ id, label }));
  }

  return all
    .filter((t) => (t.flag ? perms?.[t.flag] : false))
    .map(({ id, label }) => ({ id, label }));
}

export function canAccessCatalogs(isAdmin: boolean, perms?: CatalogPermissions | null) {
  return catalogTabsForPermissions(isAdmin, perms).length > 0;
}
