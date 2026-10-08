"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import {
  Download,
  Eye,
  Pencil,
  PlayCircle,
  Plus,
  Trash2,
  TrendingUp,
  UserCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SearchField } from "@/components/SearchField";
import { SelectField } from "@/components/SelectField";
import { TimeRangeField } from "@/components/TimeRangeField";
import { Tooltip } from "@/components/Tooltip";
import { useCatalog } from "@/hooks/useCatalog";
import { usePermissions } from "@/hooks/usePermissions";
import { lmsApi } from "@/lib/api";
import { buildQuery, cn } from "@/lib/utils";
import type { LmsClass, LmsUser } from "@/types/lms";

const STATUS_LABELS: Record<string, string> = {
  active: "Đang học",
  inactive: "Chờ khai giảng / tuyển sinh",
  ended: "Đã kết thúc",
};

const STATUS_OPTIONS = [
  { value: "active", label: STATUS_LABELS.active },
  { value: "inactive", label: STATUS_LABELS.inactive },
  { value: "ended", label: STATUS_LABELS.ended },
];

type TeacherAssignment = { lms_user_id: number; role: "teacher" | "ta" };

function formatClassDate(value?: string | null): string {
  if (!value) return "—";
  const raw = String(value).slice(0, 10);
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return raw;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

type PendingAction =
  | { type: "status"; id: number; code: string; status: string }
  | { type: "end"; id: number; code: string }
  | { type: "delete"; id: number; code: string }
  | { type: "update" };

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { pill: string; dot: string }> = {
    active: { pill: "pill-good", dot: "bg-primary-dark" },
    inactive: { pill: "pill-warn", dot: "bg-amber-700" },
    ended: { pill: "pill-danger", dot: "bg-red-800" },
  };
  const style = map[status] || { pill: "pill-neutral", dot: "bg-on-surface-variant" };
  return (
    <span className={`pill ${style.pill}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} aria-hidden />
      {STATUS_LABELS[status] || status}
    </span>
  );
}

/** Soft pastel chip from hex (light bg + darker text), matching list mockup. */
function pastelChipStyle(hex?: string | null): { backgroundColor: string; color: string } {
  const raw = (hex || "#64748b").trim();
  const m = raw.match(/^#?([0-9a-f]{6})$/i);
  if (!m) {
    return { backgroundColor: "#f1f5f9", color: "#475569" };
  }
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const mix = (c: number, toward: number, t: number) => Math.round(c + (toward - c) * t);
  // Light wash for bg; slightly darkened for text
  const bg = `rgb(${mix(r, 255, 0.82)}, ${mix(g, 255, 0.82)}, ${mix(b, 255, 0.82)})`;
  const fg = `rgb(${mix(r, 0, 0.35)}, ${mix(g, 0, 0.35)}, ${mix(b, 0, 0.35)})`;
  return { backgroundColor: bg, color: fg };
}

/** Short badge label for program (e.g. "CT thiếu nhi" → "Thiếu nhi", "IELTS …" → "IELTS"). */
function programBadgeLabel(program?: string | null, code?: string | null): string {
  const name = (program || "").trim();
  const upper = name.toUpperCase();
  if (upper.includes("IELTS")) return "IELTS";
  if (upper.includes("TOEIC")) return "TOEIC";
  if (upper.includes("HSK")) return "HSK";
  if (/\bTEEN\b/.test(upper)) return "TEEN";
  if (upper.includes("GIAO TI") || upper.includes("1:1") || upper.includes("1-1")) return "Giao tiếp";
  if (upper.includes("THIẾU NHI") || upper.includes("THIEU NHI") || upper.includes("AVTN")) {
    return "Thiếu nhi";
  }
  const stripped = name.replace(/^CT\s+/i, "").trim();
  if (stripped && stripped.length <= 24) return stripped;
  if (code) return code.replace(/_/g, " ").toUpperCase();
  return stripped || name;
}

function ProgramCourseCell({
  course,
  program,
  programColor,
  programCode,
}: {
  course?: string | null;
  program?: string | null;
  programColor?: string | null;
  programCode?: string | null;
}) {
  const badge = programBadgeLabel(program, programCode);
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="text-sm font-bold text-foreground">{course?.trim() || "—"}</span>
      {badge ? (
        <span
          className="inline-flex max-w-full items-center truncate rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style={pastelChipStyle(programColor)}
          title={program || badge}
        >
          {badge}
        </span>
      ) : null}
    </div>
  );
}

function ClassesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status: sessionStatus } = useSession();
  const { can, ready: permsReady, isAdmin } = usePermissions();
  const [, startTransition] = useTransition();

  const canViewClasses = can("classes.view");
  const canCreateClasses = can("classes.create");
  const canUpdateClasses = can("classes.update");
  const canDeleteClasses = can("classes.delete");

  const [accessChecked, setAccessChecked] = useState(false);
  const [teacherOptions, setTeacherOptions] = useState<LmsUser[]>([]);
  const [items, setItems] = useState<LmsClass[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const pendingEditId = useRef(searchParams.get("edit"));
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [filterProgramId, setFilterProgramId] = useState(searchParams.get("program_id") || "");
  const [filterTeacherId, setFilterTeacherId] = useState(
    searchParams.get("teacher_ids[]") || searchParams.get("teacher_ids") || "",
  );
  const [statuses, setStatuses] = useState<string[]>(
    searchParams.getAll("status[]").length
      ? searchParams.getAll("status[]")
      : searchParams.get("status")
        ? [searchParams.get("status")!]
        : [],
  );
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<LmsClass | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [form, setForm] = useState({
    code: "",
    program_id: "" as string,
    course_id: "" as string,
    schedule: "",
    time: "",
    room: "",
    days: [] as number[],
    teachers: [] as TeacherAssignment[],
    min_class_size: "5",
    max_class_size: "15",
    start_date: "",
    end_date: "",
  });

  const modalOpen = showCreate || editing != null;
  const emptyForm = {
    code: "",
    program_id: "",
    course_id: "",
    schedule: "",
    time: "",
    room: "",
    days: [] as number[],
    teachers: [] as TeacherAssignment[],
    min_class_size: "5",
    max_class_size: "15",
    start_date: "",
    end_date: "",
  };

  const { items: programs } = useCatalog("programs");
  const { items: allCourses } = useCatalog("courses");
  const filteredCourses = useMemo(() => {
    if (!form.program_id) return allCourses;
    return allCourses.filter((c) => String(c.program_id) === form.program_id);
  }, [allCourses, form.program_id]);

  const counts = useMemo(() => {
    const all = items.length;
    const active = items.filter((c) => c.status === "active").length;
    const inactive = items.filter((c) => c.status === "inactive").length;
    const ended = items.filter((c) => c.status === "ended").length;
    const operating = items.filter((c) => c.status === "active");
    const studentSum = operating.reduce((s, c) => s + (c.active_student_count || 0), 0);
    const fillRates = operating
      .map((c) => {
        const max = c.max_class_size || 15;
        return max > 0 ? ((c.active_student_count || 0) / max) * 100 : 0;
      })
      .filter((n) => !Number.isNaN(n));
    const avgFill =
      fillRates.length > 0
        ? Math.round((fillRates.reduce((a, b) => a + b, 0) / fillRates.length) * 10) / 10
        : 0;
    return { all, active, inactive, ended, studentSum, avgFill };
  }, [items]);

  useEffect(() => {
    if (sessionStatus === "loading" || !permsReady) return;
    if (!canViewClasses) {
      toast.error("Bạn không có quyền xem lớp học");
      router.replace("/");
      return;
    }
    setAccessChecked(true);
    lmsApi
      .users("?role=teacher&status=approved&limit=100")
      .then((usersRes) => {
        setTeacherOptions(Array.isArray(usersRes.data) ? usersRes.data : []);
      })
      .catch(() => setTeacherOptions([]));
  }, [
    sessionStatus,
    permsReady,
    canViewClasses,
    router,
  ]);

  function fetchClasses(params: {
    q: string;
    status: string[];
    program_id: string;
    teacher_id: string;
  }) {
    const query = buildQuery({
      q: params.q,
      status: params.status,
      program_id: params.program_id || undefined,
      teacher_ids: params.teacher_id ? [params.teacher_id] : undefined,
    });
    router.replace(`/classes${query}`);
    setLoading(true);
    lmsApi
      .classes(query)
      .then((res) => {
        startTransition(() => {
          setItems(Array.isArray(res.data) ? res.data : []);
          const metaTotal = res.meta?.total;
          setTotalCount(typeof metaTotal === "number" ? metaTotal : Array.isArray(res.data) ? res.data.length : 0);
          setLoading(false);
        });
      })
      .catch((e) => {
        toast.error(e.message);
        setLoading(false);
      });
  }

  function load() {
    fetchClasses({
      q,
      status: statuses,
      program_id: filterProgramId,
      teacher_id: filterTeacherId,
    });
  }

  useEffect(() => {
    if (!accessChecked) return;
    load();
     
  }, [accessChecked]);

  useEffect(() => {
    const editId = pendingEditId.current;
    if (!editId || !accessChecked || !canUpdateClasses || loading) return;

    const fromList = items.find((c) => String(c.id) === editId);
    if (fromList) {
      pendingEditId.current = null;
      openEdit(fromList);
      return;
    }

    pendingEditId.current = null;
    lmsApi
      .classDetail(editId)
      .then((res) => {
        if (res.data) openEdit(res.data as LmsClass);
      })
      .catch(() => {});
     
  }, [accessChecked, canUpdateClasses, items, loading]);

  function clearFilters() {
    setQ("");
    setFilterProgramId("");
    setFilterTeacherId("");
    setStatuses([]);
    fetchClasses({ q: "", status: [], program_id: "", teacher_id: "" });
  }

  function applyStatusFilter(next: string[]) {
    setStatuses(next);
    fetchClasses({
      q,
      status: next,
      program_id: filterProgramId,
      teacher_id: filterTeacherId,
    });
  }

  function applyProgramFilter(programId: string) {
    setFilterProgramId(programId);
    fetchClasses({
      q,
      status: statuses,
      program_id: programId,
      teacher_id: filterTeacherId,
    });
  }

  function applyTeacherFilter(teacherId: string) {
    setFilterTeacherId(teacherId);
    fetchClasses({
      q,
      status: statuses,
      program_id: filterProgramId,
      teacher_id: teacherId,
    });
  }

  function toggleDay(day: number) {
    setForm((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day].sort(),
    }));
  }

  function closeModal() {
    setShowCreate(false);
    setEditing(null);
    setForm(emptyForm);
  }

  function openCreate() {
    if (!canCreateClasses) return;
    setEditing(null);
    setForm(emptyForm);
    setShowCreate(true);
  }

  function openEdit(c: LmsClass) {
    if (c.is_locked || !canUpdateClasses) return;
    setShowCreate(false);
    setEditing(c);
    setForm({
      code: c.code || "",
      program_id: c.program_id != null ? String(c.program_id) : "",
      course_id: c.course_id != null ? String(c.course_id) : "",
      schedule: c.schedule || "",
      time: c.time || "",
      room: c.room || "",
      days: Array.isArray(c.days) ? [...c.days] : [],
      teachers: (c.teachers || []).map((t) => ({
        lms_user_id: t.lms_user_id,
        role: t.role === "ta" ? "ta" : "teacher",
      })),
      min_class_size: String(c.min_class_size ?? 5),
      max_class_size: String(c.max_class_size ?? 15),
      start_date: c.start_date ? String(c.start_date).slice(0, 10) : "",
      end_date: c.end_date ? String(c.end_date).slice(0, 10) : "",
    });
  }

  function toggleTeacher(id: number) {
    setForm((prev) => {
      const exists = prev.teachers.some((t) => t.lms_user_id === id);
      return {
        ...prev,
        teachers: exists
          ? prev.teachers.filter((t) => t.lms_user_id !== id)
          : [...prev.teachers, { lms_user_id: id, role: "teacher" as const }],
      };
    });
  }

  function setTeacherRole(id: number, role: "teacher" | "ta") {
    setForm((prev) => ({
      ...prev,
      teachers: prev.teachers.map((t) => (t.lms_user_id === id ? { ...t, role } : t)),
    }));
  }

  function buildClassBody() {
    const body: Record<string, unknown> = {
      program_id: form.program_id ? Number(form.program_id) : null,
      course_id: form.course_id ? Number(form.course_id) : null,
      schedule: form.schedule || null,
      time: form.time || null,
      room: form.room || null,
      days: form.days,
      min_class_size: form.min_class_size ? Number(form.min_class_size) : 5,
      max_class_size: form.max_class_size ? Number(form.max_class_size) : 15,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };
    const code = form.code.trim();
    if (code) body.code = code;
    if (isAdmin) {
      body.teachers = form.teachers;
    }
    return body;
  }

  function datesInvalid(): boolean {
    return !!(form.start_date && form.end_date && form.end_date < form.start_date);
  }

  async function createClassNow() {
    if (!isAdmin) return;
    if (!form.course_id) {
      toast.error("Chọn khóa học");
      return;
    }
    if (!form.teachers.length) {
      toast.error("Chọn ít nhất một giáo viên phụ trách lớp");
      return;
    }
    const min = Number(form.min_class_size);
    const max = Number(form.max_class_size);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 1 || max < 1) {
      toast.error("Sĩ số tối thiểu / tối đa không hợp lệ");
      return;
    }
    if (max < min) {
      toast.error("Sĩ số tối đa phải ≥ sĩ số tối thiểu");
      return;
    }
    if (datesInvalid()) {
      toast.error("Ngày kết thúc phải sau hoặc bằng ngày khai giảng");
      return;
    }
    try {
      await lmsApi.createClass(buildClassBody());
      toast.success("Đã tạo lớp");
      closeModal();
      load();
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err && "message" in err && typeof (err as { message: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Lỗi tạo lớp";
      toast.error(msg);
    }
  }

  function saveClass(e: FormEvent) {
    e.preventDefault();
    if (!form.course_id) {
      toast.error("Chọn khóa học");
      return;
    }
    if (editing) {
      if (isAdmin && !form.teachers.length) {
        toast.error("Chọn ít nhất một giáo viên phụ trách lớp");
        return;
      }
      const min = Number(form.min_class_size);
      const max = Number(form.max_class_size);
      if (!Number.isFinite(min) || !Number.isFinite(max) || min < 1 || max < 1) {
        toast.error("Sĩ số tối thiểu / tối đa không hợp lệ");
        return;
      }
      if (max < min) {
        toast.error("Sĩ số tối đa phải ≥ sĩ số tối thiểu");
        return;
      }
      if (datesInvalid()) {
        toast.error("Ngày kết thúc phải sau hoặc bằng ngày khai giảng");
        return;
      }
      setPendingAction({ type: "update" });
      return;
    }
    void createClassNow();
  }

  function confirmDialogCopy(action: PendingAction) {
    switch (action.type) {
      case "status":
        return {
          title: "Đổi trạng thái lớp",
          description: `Đổi trạng thái lớp ${action.code} thành «${STATUS_LABELS[action.status] || action.status}»?`,
          confirmLabel: "Đổi trạng thái",
          variant: "primary" as const,
        };
      case "end":
        return {
          title: "Kết thúc lớp",
          description: `Xác nhận kết thúc lớp ${action.code}? Lớp sẽ bị khóa chỉnh sửa.`,
          confirmLabel: "Kết thúc lớp",
          variant: "danger" as const,
        };
      case "delete":
        return {
          title: "Xóa lớp",
          description: `Xóa lớp ${action.code}? Hành động này không thể hoàn tác dễ dàng.`,
          confirmLabel: "Xóa lớp",
          variant: "danger" as const,
        };
      case "update":
        return {
          title: "Lưu thay đổi",
          description: `Lưu thay đổi lớp ${editing?.code ?? ""}?`,
          confirmLabel: "Lưu thay đổi",
          variant: "primary" as const,
        };
    }
  }

  async function runPendingAction() {
    if (!pendingAction) return;
    setActionPending(true);
    try {
      switch (pendingAction.type) {
        case "status":
          await lmsApi.updateClassStatus(pendingAction.id, pendingAction.status);
          toast.success("Đã cập nhật trạng thái");
          break;
        case "end":
          await lmsApi.endClass(pendingAction.id);
          toast.success("Đã kết thúc lớp");
          break;
        case "delete":
          await lmsApi.deleteClass(pendingAction.id);
          toast.success("Đã xóa lớp");
          break;
        case "update":
          if (!editing) break;
          await lmsApi.updateClass(editing.id, buildClassBody());
          toast.success("Đã cập nhật lớp");
          closeModal();
          break;
      }
      setPendingAction(null);
      load();
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err && "message" in err && typeof (err as { message: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Thao tác thất bại";
      toast.error(msg);
    } finally {
      setActionPending(false);
    }
  }

  if (!accessChecked || !canViewClasses) {
    return (
      <div className="flex w-full flex-col gap-6">
        <div className="h-10 w-72 animate-pulse rounded-lg bg-surface-low" />
        <div className="h-40 animate-pulse rounded-xl bg-surface-low" />
        <div className="h-64 animate-pulse rounded-xl bg-surface-low" />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-col">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            <span>Học vụ</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Quản lý Lớp học</h1>
          <p className="mt-0.5 text-sm text-on-surface-variant">
            Danh sách các lớp đang giảng dạy và phân công phụ trách tại phân hiệu.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:self-auto">
          <button type="button" className="btn btn-ghost" disabled title="Sắp có">
            <Download className="h-4 w-4" />
            Xuất Excel
          </button>
          {canCreateClasses ? (
            <button
              type="button"
              className="btn btn-primary w-full sm:w-auto"
              onClick={openCreate}
            >
              <Plus className="h-4 w-4" />
              Thêm lớp học mới
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card flex items-center justify-between !p-4">
          <div className="flex flex-col">
            <span className="text-xs text-on-surface-variant">Tổng số lớp (kết quả lọc)</span>
            <span className="mt-1 text-2xl font-semibold text-foreground">{counts.all}</span>
            <span className="mt-1 flex items-center gap-0.5 text-[11px] font-semibold text-primary">
              <TrendingUp className="h-3.5 w-3.5" /> Theo bộ lọc hiện tại
            </span>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-low text-primary">
            <PlayCircle className="h-6 w-6" />
          </div>
        </div>
        <div className="card flex items-center justify-between !p-4">
          <div className="flex flex-col">
            <span className="text-xs text-on-surface-variant">Lớp đang vận hành</span>
            <span className="mt-1 text-2xl font-semibold text-primary">{counts.active}</span>
            <span className="mt-1 text-[11px] text-on-surface-variant">
              {counts.studentSum} học viên hoạt động
            </span>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary-dark">
            <PlayCircle className="h-6 w-6" />
          </div>
        </div>
        <div className="card flex items-center justify-between !p-4">
          <div className="flex flex-col">
            <span className="text-xs text-on-surface-variant">Tỷ lệ lấp đầy TB</span>
            <span className="mt-1 text-2xl font-semibold text-foreground">{counts.avgFill}%</span>
            <span className="mt-1 text-[11px] font-semibold text-primary">Theo sĩ số tối đa từng lớp</span>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-low text-secondary">
            <UserCheck className="h-6 w-6" />
          </div>
        </div>
        <div className="card flex items-center justify-between !p-4">
          <div className="flex flex-col">
            <span className="text-xs text-on-surface-variant">Lớp đã kết thúc</span>
            <span className="mt-1 text-2xl font-semibold text-on-surface-variant">{counts.ended}</span>
            <span className="mt-1 text-[11px] text-secondary">Đã chốt sổ đánh giá</span>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-low text-secondary">
            <XCircle className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="card !p-4">
        <div className="flex flex-wrap items-center gap-2">
          <SearchField
            className="w-full"
            wrapperClassName="min-w-[12rem] flex-1 basis-[14rem]"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") load();
            }}
            placeholder="Tìm mã lớp, khóa học..."
            type="text"
          />
          <SelectField
            className="min-w-[10rem] flex-1 basis-[10rem] sm:flex-none sm:w-44"
            aria-label="Lọc theo chương trình"
            value={filterProgramId}
            placeholder="Chương trình"
            options={[
              { value: "", label: "Tất cả chương trình" },
              ...programs.map((p) => ({ value: String(p.id), label: p.name })),
            ]}
            onChange={applyProgramFilter}
          />
          <SelectField
            className="min-w-[10rem] flex-1 basis-[10rem] sm:flex-none sm:w-44"
            aria-label="Lọc theo giáo viên"
            value={filterTeacherId}
            placeholder="Giáo viên"
            options={[
              { value: "", label: "Tất cả giáo viên" },
              ...teacherOptions.map((t) => ({
                value: String(t.id),
                label: t.name || t.email,
              })),
            ]}
            onChange={applyTeacherFilter}
          />
          <SelectField
            className="min-w-[10rem] flex-1 basis-[10rem] sm:flex-none sm:w-52"
            aria-label="Lọc theo trạng thái"
            value={statuses.length === 1 ? statuses[0] : ""}
            placeholder="Trạng thái"
            options={[
              { value: "", label: "Tất cả trạng thái" },
              ...STATUS_OPTIONS,
            ]}
            onChange={(v) => applyStatusFilter(v ? [v] : [])}
          />
          <button type="button" className="btn btn-ghost h-10 shrink-0" onClick={clearFilters}>
            Xóa lọc
          </button>
          <span className="shrink-0 text-xs font-semibold text-on-surface-variant whitespace-nowrap">
            {loading ? "…" : `${totalCount} lớp`}
          </span>
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-xl bg-surface shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-low text-xs font-semibold text-on-surface-variant">
                <th className="whitespace-nowrap px-4 py-3">Mã Lớp</th>
                <th className="whitespace-nowrap px-4 py-3">Chương trình / Khóa học</th>
                <th className="whitespace-nowrap px-4 py-3">Lịch học</th>
                <th className="whitespace-nowrap px-1 py-2">Ngày khai giảng</th>
                <th className="whitespace-nowrap px-1 py-2">Ngày kết thúc</th>
                <th className="whitespace-nowrap px-4 py-2">Phòng</th>
                <th className="whitespace-nowrap px-4 py-3">Giáo viên</th>
                <th className="whitespace-nowrap px-4 py-3 w-44">Sĩ số</th>
                <th className="whitespace-nowrap px-4 py-3 text-center">Trạng thái</th>
                <th className="whitespace-nowrap px-4 py-3 pr-6 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-low text-foreground">
              {items.map((c) => {
                const max = c.max_class_size || 15;
                const pct = max > 0 ? Math.round(((c.active_student_count || 0) / max) * 100) : 0;
                const mainTeachers = (c.teachers || []).filter((t) => t.role !== "ta");
                const tas = (c.teachers || []).filter((t) => t.role === "ta");
                return (
                  <tr
                    key={c.id}
                    className={cn(
                      "transition-colors hover:bg-surface-low/60",
                      c.status === "ended" && "opacity-75",
                    )}
                  >
                    <td className="px-4 py-3.5 font-semibold">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-primary-soft px-2.5 py-1 font-mono text-[11px] font-semibold text-primary-dark">
                        {c.code}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <ProgramCourseCell
                        course={c.course}
                        program={c.program}
                        programColor={c.program_color}
                        programCode={c.program_code}
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-medium">{c.schedule || "—"}</span>
                        <span className="text-[11px] text-on-surface-variant">{c.time || ""}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-1.5 text-xs">
                      {formatClassDate(c.start_date)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-1.5 text-xs">
                      {formatClassDate(c.end_date)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded bg-surface-low px-2 py-1 font-mono text-xs">
                        {c.room || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex min-w-[8rem] flex-col gap-0.5 text-xs">
                        <span className="font-medium">
                          {mainTeachers.length
                            ? mainTeachers.map((t) => t.name || t.email || "—").join(", ")
                            : "—"}
                        </span>
                        <span className="text-on-surface-variant">
                          TA:{" "}
                          {tas.length
                            ? tas.map((t) => t.name || t.email || "—").join(", ")
                            : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span>
                            {c.active_student_count}/{max} HV
                          </span>
                          <span className="text-primary">{pct}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-low">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        {c.below_min_size ? (
                          <span className="text-[11px] text-warn">
                            Chưa đủ tối thiểu {c.min_class_size ?? 5}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <StatusPill status={c.status} />
                    </td>
                    <td className="px-4 py-3.5 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!c.is_locked ? (
                          <Tooltip content="Điểm danh">
                            <Link
                              href={`/attendance?class_id=${c.id}`}
                              className="btn btn-primary !px-2.5 !py-1 text-[11px]"
                              aria-label="Điểm danh"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                            </Link>
                          </Tooltip>
                        ) : null}
                        <Tooltip content="Xem chi tiết">
                          <Link
                            href={`/classes/${c.id}`}
                            className="rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-surface-low hover:text-foreground"
                            aria-label="Xem chi tiết"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Tooltip>
                        {!c.is_locked && canUpdateClasses ? (
                          <Tooltip content="Chỉnh sửa lớp">
                            <button
                              type="button"
                              className="rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-surface-low hover:text-foreground"
                              aria-label="Chỉnh sửa lớp"
                              onClick={() => openEdit(c)}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </Tooltip>
                        ) : null}
                        {!c.is_locked && canUpdateClasses ? (
                          <Tooltip content="Kết thúc lớp">
                            <button
                              type="button"
                              className="rounded-md p-1.5 text-danger transition-colors hover:bg-danger-container"
                              aria-label="Kết thúc lớp"
                              onClick={() => setPendingAction({ type: "end", id: c.id, code: c.code })}
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </Tooltip>
                        ) : null}
                        {canDeleteClasses && !c.is_locked ? (
                          <Tooltip content="Xóa lớp">
                            <button
                              type="button"
                              className="rounded-md p-1.5 text-danger transition-colors hover:bg-danger-container"
                              aria-label="Xóa lớp"
                              onClick={() =>
                                setPendingAction({ type: "delete", id: c.id, code: c.code })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </Tooltip>
                        ) : null}
                        {isAdmin ? (
                          <Tooltip content="Đổi trạng thái lớp">
                            <SelectField
                              size="sm"
                              className="w-[7.5rem]"
                              aria-label={`Trạng thái lớp ${c.code}`}
                              value={c.status}
                              options={STATUS_OPTIONS}
                              onChange={(status) => {
                                if (status === c.status) return;
                                setPendingAction({
                                  type: "status",
                                  id: c.id,
                                  code: c.code,
                                  status,
                                });
                              }}
                            />
                          </Tooltip>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-2 bg-surface-low/40 p-4">
          <span className="text-xs text-on-surface-variant">
            {loading ? "Đang tải..." : `Hiển thị ${items.length} / ${totalCount} lớp học`}
          </span>
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#213145]/40 p-4 backdrop-blur-sm">
          <form
            noValidate
            onSubmit={saveClass}
            className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface shadow-xl"
          >
            <div className="flex items-center justify-between bg-surface-low px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  {editing ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </div>
                <div className="flex flex-col">
                  <h3 className="text-lg font-semibold text-foreground">
                    {editing ? `Chỉnh sửa lớp ${editing.code}` : "Tạo Lớp học mới"}
                  </h3>
                  <span className="text-xs text-on-surface-variant">
                    {editing
                      ? isAdmin
                        ? "Cập nhật lịch, phòng học và giáo viên phụ trách"
                        : "Cập nhật chương trình, lịch và phòng học"
                      : "Khởi tạo lớp và gán giáo viên phụ trách"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-high"
                onClick={closeModal}
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="flex max-h-[85dvh] flex-col gap-4 overflow-y-auto p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">Mã lớp</label>
                <input
                  className="input font-mono text-sm font-semibold"
                  placeholder="Để trống sẽ tự tạo từ khóa học"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
                <p className="text-[11px] text-on-surface-variant">
                  {editing
                    ? "Có thể chỉnh sửa mã lớp (phải là duy nhất)."
                    : "Không bắt buộc — để trống hệ thống tự tạo từ tên khóa học."}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Chương trình đào tạo
                  </label>
                  <SelectField
                    value={form.program_id}
                    placeholder="- Chương trình -"
                    options={[
                      { value: "", label: "- Chương trình -" },
                      ...programs.map((p) => ({ value: String(p.id), label: p.name })),
                    ]}
                    onChange={(program_id) =>
                      setForm((prev) => ({
                        ...prev,
                        program_id,
                        course_id: "",
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Khóa học <span className="text-danger">*</span>
                  </label>
                  <SelectField
                    required
                    value={form.course_id}
                    placeholder="- Khóa học -"
                    options={[
                      { value: "", label: "- Khóa học -" },
                      ...filteredCourses.map((c) => ({
                        value: String(c.id),
                        label: c.name,
                      })),
                    ]}
                    onChange={(course_id) => setForm({ ...form, course_id })}
                  />
                  {filteredCourses.length === 0 ? (
                    <p className="text-[11px] text-amber-700">
                      Hãy thêm khóa học trong cùng chương trình nhé.
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Phòng học</label>
                  <input
                    className="input"
                    placeholder="Lab 02"
                    value={form.room}
                    onChange={(e) => setForm({ ...form, room: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Sĩ số tối thiểu
                    </label>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      max={100}
                      required
                      value={form.min_class_size}
                      onChange={(e) => setForm({ ...form, min_class_size: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Sĩ số tối đa
                    </label>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      max={100}
                      required
                      value={form.max_class_size}
                      onChange={(e) => setForm({ ...form, max_class_size: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-foreground">
                  Ngày học trong tuần
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((label, idx) => (
                    <button
                      key={label}
                      type="button"
                      className={cn(
                        "flex h-10 items-center justify-center rounded-lg text-xs font-semibold transition-all",
                        form.days.includes(idx)
                          ? "bg-primary text-on-primary"
                          : "bg-surface-low text-foreground",
                      )}
                      onClick={() => toggleDay(idx)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Khung giờ học</label>
                  <TimeRangeField
                    value={form.time}
                    onChange={(time) => setForm({ ...form, time })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Mô tả lịch</label>
                  <input
                    className="input"
                    placeholder="T3 - T5 - T7"
                    value={form.schedule}
                    onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Ngày khai giảng</label>
                  <input
                    className="input"
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Ngày kết thúc</label>
                  <input
                    className="input"
                    type="date"
                    value={form.end_date}
                    min={form.start_date || undefined}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
              </div>
              {isAdmin ? (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-foreground">
                    Giáo viên / Trợ giảng <span className="text-danger">*</span>
                  </label>
                  {teacherOptions.length === 0 ? (
                    <p className="text-xs text-on-surface-variant">
                      Chưa có giáo viên đã duyệt để gán.
                    </p>
                  ) : (
                    <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-surface-low/40 p-2">
                      {teacherOptions.map((t) => {
                        const assignment = form.teachers.find((x) => x.lms_user_id === t.id);
                        const checked = !!assignment;
                        return (
                          <div
                            key={t.id}
                            className="flex flex-wrap items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface"
                          >
                            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleTeacher(t.id)}
                              />
                              <span className="truncate font-medium">{t.name || t.email}</span>
                            </label>
                            {assignment ? (
                              <select
                                className="input !h-8 !w-auto !py-0 text-xs"
                                value={assignment.role}
                                onChange={(e) =>
                                  setTeacherRole(t.id, e.target.value === "ta" ? "ta" : "teacher")
                                }
                              >
                                <option value="teacher">Giáo viên</option>
                                <option value="ta">Trợ giảng (TA)</option>
                              </select>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-surface-low px-6 py-4">
              <button type="button" className="btn btn-ghost" onClick={closeModal}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary">
                {editing ? "Lưu thay đổi" : "Lưu & Kích hoạt lớp"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {pendingAction ? (
        <ConfirmDialog
          open
          {...confirmDialogCopy(pendingAction)}
          pending={actionPending}
          onCancel={() => {
            if (!actionPending) setPendingAction(null);
          }}
          onConfirm={() => void runPendingAction()}
        />
      ) : null}
    </div>
  );
}

export default function ClassesPage() {
  return (
    <Suspense fallback={<div className="text-sm text-on-surface-variant">Đang tải...</div>}>
      <ClassesContent />
    </Suspense>
  );
}
