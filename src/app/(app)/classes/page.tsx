"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import {
  Download,
  Eye,
  Filter,
  Pencil,
  PlayCircle,
  Plus,
  RefreshCw,
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
import { useCatalog } from "@/hooks/useCatalog";
import { lmsApi } from "@/lib/api";
import { buildQuery, cn } from "@/lib/utils";
import type { CatalogPermissions, LmsClass, LmsUser } from "@/types/lms";

const STATUS_LABELS: Record<string, string> = {
  active: "Đang hoạt động",
  inactive: "Ngừng hoạt động",
  ended: "Đã kết thúc",
};

const STATUS_OPTIONS = [
  { value: "active", label: STATUS_LABELS.active },
  { value: "inactive", label: STATUS_LABELS.inactive },
  { value: "ended", label: STATUS_LABELS.ended },
];

function formatClassDate(value?: string | null): string {
  if (!value) return "";
  const raw = String(value).slice(0, 10);
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return raw;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function formatClassDateRange(start?: string | null, end?: string | null): string {
  const a = formatClassDate(start);
  const b = formatClassDate(end);
  if (a && b) return `${a} – ${b}`;
  if (a) return `Từ ${a}`;
  if (b) return `Đến ${b}`;
  return "";
}

type PendingAction =
  | { type: "status"; id: number; code: string; status: string }
  | { type: "end"; id: number; code: string }
  | { type: "delete"; id: number; code: string }
  | { type: "update" };

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "pill-good",
    inactive: "pill-neutral",
    ended: "pill-warn",
  };
  return (
    <span className={`pill ${map[status] || "pill-neutral"}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function ClassesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";
  const [, startTransition] = useTransition();

  const [accessChecked, setAccessChecked] = useState(false);
  const [canManageClasses, setCanManageClasses] = useState(false);
  const [teacherOptions, setTeacherOptions] = useState<LmsUser[]>([]);
  const [items, setItems] = useState<LmsClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [statuses, setStatuses] = useState<string[]>(
    searchParams.getAll("status[]").length
      ? searchParams.getAll("status[]")
      : searchParams.get("status")
        ? [searchParams.get("status")!]
        : ["active"],
  );
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<LmsClass | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [form, setForm] = useState({
    program_id: "" as string,
    course_id: "" as string,
    schedule: "",
    time: "",
    room: "",
    days: [] as number[],
    teacher_ids: [] as number[],
    min_class_size: "5",
    max_class_size: "15",
    start_date: "",
    end_date: "",
  });

  const modalOpen = showCreate || editing != null;
  const emptyForm = {
    program_id: "",
    course_id: "",
    schedule: "",
    time: "",
    room: "",
    days: [] as number[],
    teacher_ids: [] as number[],
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
    if (sessionStatus === "loading") return;
    lmsApi
      .me()
      .then(async (res) => {
        const role = res.data?.user?.role || (session?.user as { role?: string } | undefined)?.role;
        const flags = (res.data?.user?.catalog_permissions ||
          null) as CatalogPermissions | null;
        const admin = role === "admin";
        const allowed = admin || !!flags?.manage_classes;
        if (!allowed) {
          toast.error("Bạn không có quyền quản lý lớp học");
          router.replace("/");
          return;
        }
        setCanManageClasses(true);
        setAccessChecked(true);
        if (admin) {
          try {
            const usersRes = await lmsApi.users("?role=teacher&status=approved&limit=100");
            setTeacherOptions(Array.isArray(usersRes.data) ? usersRes.data : []);
          } catch {
            setTeacherOptions([]);
          }
        }
      })
      .catch((e) => {
        toast.error(e.message || "Không kiểm tra được quyền");
        router.replace("/");
      });
  }, [sessionStatus, router, session?.user]);

  function load() {
    const query = buildQuery({
      q,
      status: statuses,
    });
    router.replace(`/classes${query}`);
    setLoading(true);
    lmsApi
      .classes(query)
      .then((res) => {
        startTransition(() => {
          setItems(Array.isArray(res.data) ? res.data : []);
          setLoading(false);
        });
      })
      .catch((e) => {
        toast.error(e.message);
        setLoading(false);
      });
  }

  useEffect(() => {
    if (!accessChecked) return;
    load();
     
  }, [accessChecked]);

  function setStatusFilter(next: string[], qOverride?: string) {
    const search = qOverride !== undefined ? qOverride : q;
    setStatuses(next);
    if (qOverride !== undefined) setQ(qOverride);
    const query = buildQuery({ q: search, status: next });
    router.replace(`/classes${query}`);
    setLoading(true);
    lmsApi
      .classes(query)
      .then((res) => {
        startTransition(() => {
          setItems(Array.isArray(res.data) ? res.data : []);
          setLoading(false);
        });
      })
      .catch((e) => {
        toast.error(e.message);
        setLoading(false);
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
    if (!isAdmin) return;
    setEditing(null);
    setForm(emptyForm);
    setShowCreate(true);
  }

  function openEdit(c: LmsClass) {
    if (c.is_locked || !canManageClasses) return;
    setShowCreate(false);
    setEditing(c);
    setForm({
      program_id: c.program_id != null ? String(c.program_id) : "",
      course_id: c.course_id != null ? String(c.course_id) : "",
      schedule: c.schedule || "",
      time: c.time || "",
      room: c.room || "",
      days: Array.isArray(c.days) ? [...c.days] : [],
      teacher_ids: (c.teachers || []).map((t) => t.lms_user_id),
      min_class_size: String(c.min_class_size ?? 5),
      max_class_size: String(c.max_class_size ?? 15),
      start_date: c.start_date ? String(c.start_date).slice(0, 10) : "",
      end_date: c.end_date ? String(c.end_date).slice(0, 10) : "",
    });
  }

  function toggleTeacher(id: number) {
    setForm((prev) => ({
      ...prev,
      teacher_ids: prev.teacher_ids.includes(id)
        ? prev.teacher_ids.filter((x) => x !== id)
        : [...prev.teacher_ids, id],
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
    if (isAdmin) {
      body.teachers = form.teacher_ids.map((lms_user_id) => ({
        lms_user_id,
        role: "teacher",
      }));
    }
    return body;
  }

  function datesInvalid(): boolean {
    return !!(form.start_date && form.end_date && form.end_date < form.start_date);
  }

  async function createClassNow() {
    if (!isAdmin) return;
    if (!form.teacher_ids.length) {
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
      toast.error(err instanceof Error ? err.message : "Lỗi tạo lớp");
    }
  }

  function saveClass(e: FormEvent) {
    e.preventDefault();
    if (editing) {
      if (isAdmin && !form.teacher_ids.length) {
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
      toast.error(err instanceof Error ? err.message : "Thao tác thất bại");
    } finally {
      setActionPending(false);
    }
  }

  if (!accessChecked || !canManageClasses) {
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
          {isAdmin ? (
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

      <div className="card flex flex-col gap-4 !p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-low p-1.5">
          <div className="flex items-center gap-1 overflow-x-auto">
            {(
              [
                { key: "all", label: "Tất cả", value: [] as string[] },
                { key: "active", label: "Đang hoạt động", value: ["active"] },
                { key: "inactive", label: "Ngừng hoạt động", value: ["inactive"] },
                { key: "ended", label: "Đã kết thúc", value: ["ended"] },
              ] as const
            ).map((tab) => {
              const selected =
                tab.value.length === 0
                  ? statuses.length === 0
                  : statuses.length === 1 && statuses[0] === tab.value[0];
              return (
                <button
                  key={tab.key}
                  type="button"
                  className={cn(
                    "whitespace-nowrap rounded-md px-4 py-1.5 text-xs font-semibold transition-colors",
                    selected
                      ? "bg-surface text-primary shadow-sm"
                      : "text-on-surface-variant hover:text-foreground",
                  )}
                  onClick={() => setStatusFilter([...tab.value])}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2 lg:grid-cols-12">
          <SearchField
            className="w-full"
            wrapperClassName="w-full sm:max-w-xs lg:col-span-5 lg:max-w-none"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo mã lớp (STX-...), tên khóa học..."
            type="text"
          />
          <div className="flex w-full items-center justify-stretch gap-1.5 sm:justify-end lg:col-span-7">
            <button type="button" className="btn btn-ghost h-10 flex-1 sm:flex-none" onClick={load}>
              <Filter className="h-4 w-4" />
              Lọc
            </button>
            <button
              type="button"
              className="btn btn-ghost h-10 !px-2"
              title="Đặt lại bộ lọc"
              onClick={() => setStatusFilter(["active"], "")}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-xl bg-surface shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-low text-xs font-semibold text-on-surface-variant">
                <th className="whitespace-nowrap px-4 py-3">Mã Lớp</th>
                <th className="whitespace-nowrap px-4 py-3">Khóa học & Chương trình</th>
                <th className="whitespace-nowrap px-4 py-3">Lịch học</th>
                <th className="whitespace-nowrap px-4 py-3">Phòng học</th>
                <th className="whitespace-nowrap px-4 py-3 w-44">Sĩ số</th>
                <th className="whitespace-nowrap px-4 py-3 text-center">Trạng thái</th>
                <th className="whitespace-nowrap px-4 py-3 pr-6 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-low text-foreground">
              {items.map((c) => {
                const max = c.max_class_size || 15;
                const pct = max > 0 ? Math.round(((c.active_student_count || 0) / max) * 100) : 0;
                const dateRange = formatClassDateRange(c.start_date, c.end_date);
                return (
                  <tr
                    key={c.id}
                    className={cn(
                      "transition-colors hover:bg-surface-low/60",
                      c.status === "ended" && "opacity-75",
                    )}
                  >
                    <td className="px-4 py-3.5 font-semibold">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary-dark">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {c.code}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-semibold">{c.course || "—"}</span>
                        <span className="text-[11px] text-on-surface-variant">{c.program || ""}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-medium">{c.schedule || "—"}</span>
                        <span className="text-[11px] text-on-surface-variant">{c.time || ""}</span>
                        {dateRange ? (
                          <span className="text-[11px] text-on-surface-variant">{dateRange}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded bg-surface-low px-2 py-1 font-mono text-xs">
                        {c.room || "—"}
                      </span>
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
                          <Link
                            href={`/attendance?class_id=${c.id}`}
                            className="btn btn-primary !px-2.5 !py-1 text-[11px]"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            Điểm danh
                          </Link>
                        ) : null}
                        <Link
                          href={`/classes/${c.id}`}
                          className="rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-surface-low hover:text-foreground"
                          title="Xem chi tiết"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {!c.is_locked && canManageClasses ? (
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-surface-low hover:text-foreground"
                            title="Chỉnh sửa"
                            onClick={() => openEdit(c)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        ) : null}
                        {!c.is_locked && canManageClasses ? (
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-danger transition-colors hover:bg-danger-container"
                            title="Kết thúc lớp"
                            onClick={() => setPendingAction({ type: "end", id: c.id, code: c.code })}
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        ) : null}
                        {isAdmin && !c.is_locked ? (
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-danger transition-colors hover:bg-danger-container"
                            title="Xóa lớp"
                            onClick={() =>
                              setPendingAction({ type: "delete", id: c.id, code: c.code })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                        {isAdmin ? (
                          <SelectField
                            size="sm"
                            className="w-[9.5rem]"
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
            {loading
              ? "Đang tải..."
              : `Hiển thị ${items.length} lớp học`}
          </span>
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#213145]/40 p-4 backdrop-blur-sm">
          <form
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
              {editing ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-on-surface-variant">
                    Mã lớp (không đổi)
                  </label>
                  <input
                    className="input font-mono text-sm font-semibold"
                    value={editing.code}
                    disabled
                    readOnly
                  />
                </div>
              ) : null}
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
                  {!editing ? (
                    <p className="text-[11px] text-on-surface-variant">
                      Mã lớp sẽ được tạo tự động từ tên khóa học.
                    </p>
                  ) : (
                    <p className="text-[11px] text-on-surface-variant">
                      Đổi khóa học không thay đổi mã lớp.
                    </p>
                  )}
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
                    Giáo viên phụ trách <span className="text-danger">*</span>
                  </label>
                  {teacherOptions.length === 0 ? (
                    <p className="text-xs text-on-surface-variant">
                      Chưa có giáo viên đã duyệt để gán.
                    </p>
                  ) : (
                    <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-surface-low/40 p-2">
                      {teacherOptions.map((t) => {
                        const checked = form.teacher_ids.includes(t.id);
                        return (
                          <label
                            key={t.id}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTeacher(t.id)}
                            />
                            <span className="font-medium">{t.name || t.email}</span>
                            {t.name && t.email ? (
                              <span className="text-xs text-on-surface-variant">{t.email}</span>
                            ) : null}
                          </label>
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
