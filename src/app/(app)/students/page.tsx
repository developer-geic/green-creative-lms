"use client";

import { FormEvent, Suspense, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Pencil, Plus, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { SearchField } from "@/components/SearchField";
import { lmsApi } from "@/lib/api";
import { buildQuery } from "@/lib/utils";
import type { LmsClass, LmsStudent } from "@/types/lms";

const EMPTY_FORM = {
  full_name: "",
  english_name: "",
  parent_phone: "",
  notes: "",
};

type StudentForm = typeof EMPTY_FORM;

function StudentFormModal({
  editing,
  pending,
  form,
  onChange,
  onClose,
  onSubmit,
}: {
  editing: LmsStudent | null;
  pending: boolean;
  form: StudentForm;
  onChange: (patch: Partial<StudentForm>) => void;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#213145]/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={onSubmit}
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-surface shadow-xl"
      >
        <div className="flex items-center justify-between bg-surface-low px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
              {editing ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold text-foreground">
                {editing ? "Sửa học viên" : "Thêm học viên"}
              </h3>
              <span className="text-xs text-on-surface-variant">
                {editing
                  ? "Cập nhật thông tin master, áp dụng cho mọi lớp đã enroll"
                  : "Tạo hồ sơ master để enroll vào lớp sau"}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-high"
            onClick={onClose}
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        <div className="flex max-h-[85dvh] flex-col gap-4 overflow-y-auto p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">
              Họ tên <span className="text-danger">*</span>
            </label>
            <input
              className="input"
              required
              value={form.full_name}
              onChange={(e) => onChange({ full_name: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">Tên tiếng Anh</label>
            <input
              className="input"
              value={form.english_name}
              onChange={(e) => onChange({ english_name: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">SĐT phụ huynh</label>
            <input
              className="input"
              value={form.parent_phone}
              onChange={(e) => onChange({ parent_phone: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">Ghi chú</label>
            <textarea
              className="input min-h-[88px]"
              value={form.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-surface-low px-6 py-4">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {editing ? "Lưu thay đổi" : "Thêm học viên"}
          </button>
        </div>
      </form>
    </div>
  );
}

function StudentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<LmsStudent[]>([]);
  const [classes, setClasses] = useState<LmsClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [classId, setClassId] = useState(searchParams.get("class_id") || "");
  const [canManage, setCanManage] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<LmsStudent | null>(null);
  const [form, setForm] = useState<StudentForm>(EMPTY_FORM);

  const modalOpen = showCreate || editing != null;

  function loadStudents(nextQ = q, nextClassId = classId) {
    const query = buildQuery({ q: nextQ, class_id: nextClassId });
    router.replace(`/students${query}`);
    setLoading(true);
    lmsApi
      .students(query)
      .then((res) => {
        startTransition(() => {
          setItems(res.data || []);
          setLoading(false);
        });
      })
      .catch((e) => {
        toast.error(e.message);
        setLoading(false);
      });
  }

  useEffect(() => {
    Promise.all([
      lmsApi.classes("?limit=100"),
      lmsApi.students(buildQuery({ q, class_id: classId })),
      lmsApi.me(),
    ])
      .then(([classesRes, studentsRes, meRes]) => {
        setClasses(classesRes.data || []);
        setItems(studentsRes.data || []);
        const role = meRes.data?.user?.role;
        const flags = meRes.data?.user?.catalog_permissions;
        setCanManage(role === "admin" || !!flags?.manage_students);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
     
  }, []);

  function closeModal() {
    setShowCreate(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowCreate(true);
  }

  function openEdit(student: LmsStudent) {
    setShowCreate(false);
    setEditing(student);
    setForm({
      full_name: student.full_name || "",
      english_name: student.english_name || "",
      parent_phone: student.parent_phone || "",
      notes: student.notes || "",
    });
  }

  function patchForm(patch: Partial<StudentForm>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function saveStudent(e: FormEvent) {
    e.preventDefault();
    const body = {
      full_name: form.full_name.trim(),
      english_name: form.english_name.trim() || null,
      parent_phone: form.parent_phone.trim() || null,
      notes: form.notes.trim() || null,
    };
    startTransition(async () => {
      try {
        if (editing) {
          await lmsApi.updateStudent(editing.id, body);
          toast.success("Đã cập nhật học viên");
        } else {
          await lmsApi.createStudent(body);
          toast.success("Đã thêm học viên");
        }
        closeModal();
        loadStudents();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Không lưu được học viên");
      }
    });
  }

  function removeStudent(student: LmsStudent) {
    if (!confirm(`Xóa học viên "${student.full_name}"?`)) return;
    startTransition(async () => {
      try {
        await lmsApi.deleteStudent(student.id);
        toast.success("Đã xóa học viên");
        if (editing?.id === student.id) closeModal();
        loadStudents();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Không xóa được học viên");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">Học viên</h1>
          <p className="text-sm text-on-surface-variant">
            Hồ sơ master dùng chung nhiều lớp. Enroll vào lớp từ chi tiết lớp học.
          </p>
        </div>
        {canManage || isAdmin ? (
          <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Thêm học viên
          </button>
        ) : null}
      </div>
      <div className="card flex flex-wrap gap-3">
        <SearchField
          className="w-full"
          wrapperClassName="w-full sm:max-w-xs"
          placeholder="Tìm tên..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="text"
        />
        <select
          className="input w-full sm:max-w-xs"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
        >
          <option value="">Tất cả lớp</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={() => loadStudents()}>
          Lọc
        </button>
      </div>
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-slate-500">
                <th className="py-2">Họ tên</th>
                <th>Tên EN</th>
                <th>Lớp / trạng thái</th>
                <th>SĐT PH</th>
                {canManage || isAdmin ? <th className="text-right">Hành động</th> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-b border-border/70">
                  <td className="py-2 font-medium">{s.full_name}</td>
                  <td className="text-slate-600">{s.english_name || "—"}</td>
                  <td className="text-xs text-slate-600">
                    {(s.enrollments || [])
                      .map((e) => `${e.class_code || e.class_id} (${e.status_name || e.status})`)
                      .join(", ") || "—"}
                  </td>
                  <td>{s.parent_phone || "—"}</td>
                  {canManage || isAdmin ? (
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-surface-low hover:text-foreground"
                          title="Sửa"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-danger transition-colors hover:bg-danger-container"
                          title="Xóa"
                          onClick={() => removeStudent(s)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && !items.length && (
          <p className="py-6 text-center text-sm text-slate-500">Không có học viên.</p>
        )}
      </div>
      {modalOpen ? (
        <StudentFormModal
          editing={editing}
          pending={pending}
          form={form}
          onChange={patchForm}
          onClose={closeModal}
          onSubmit={saveStudent}
        />
      ) : null}
    </div>
  );
}

export default function StudentsPage() {
  return (
    <Suspense fallback={<div>Đang tải...</div>}>
      <StudentsContent />
    </Suspense>
  );
}
