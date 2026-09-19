"use client";

import { FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { lmsApi } from "@/lib/api";
import type { CatalogPermissions } from "@/types/lms";

const LABELS: Array<{ key: keyof CatalogPermissions; label: string }> = [
  { key: "manage_programs", label: "Chương trình" },
  { key: "manage_courses", label: "Khóa học" },
  { key: "manage_students", label: "Thêm/sửa học viên" },
  { key: "manage_student_statuses", label: "Trạng thái HV" },
  { key: "manage_absorption_levels", label: "Mức tiếp thu" },
  { key: "manage_classes", label: "Chỉnh sửa lớp học" },
];

const EMPTY: CatalogPermissions = {
  manage_programs: false,
  manage_courses: false,
  manage_students: false,
  manage_student_statuses: false,
  manage_absorption_levels: false,
  manage_classes: false,
};

export function CatalogPermissionEditor({
  userId,
  initial,
  onSaved,
}: {
  userId: number | string;
  initial?: CatalogPermissions | null;
  onSaved?: (flags: CatalogPermissions) => void;
}) {
  const [flags, setFlags] = useState<CatalogPermissions>(initial || EMPTY);
  const [pending, startTransition] = useTransition();

  function toggle(key: keyof CatalogPermissions) {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function save(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await lmsApi.updateCatalogPermissions(userId, flags);
        toast.success("Đã lưu quyền danh mục");
        onSaved?.(res.data || flags);
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  }

  return (
    <form onSubmit={save} className="card space-y-3">
      <h2 className="font-semibold">Quyền danh mục</h2>
      <p className="text-xs text-slate-500">
        Giáo viên chỉ CRUD danh mục / hồ sơ học viên khi được bật. Đọc danh mục (dropdown) luôn được khi đã đăng nhập. Quyền học viên dùng ở trang Học viên và khi thêm HV mới vào lớp.
      </p>
      <div className="space-y-2">
        {LABELS.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!flags[key]} onChange={() => toggle(key)} />
            {label}
          </label>
        ))}
      </div>
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Đang lưu..." : "Lưu quyền"}
      </button>
    </form>
  );
}
