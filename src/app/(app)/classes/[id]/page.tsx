"use client";

import Link from "next/link";
import { FormEvent, useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import {
  CalendarCheck,
  Pencil,
  Plus,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SearchField } from "@/components/SearchField";
import { Tooltip } from "@/components/Tooltip";
import { useCatalog } from "@/hooks/useCatalog";
import { usePermissions } from "@/hooks/usePermissions";
import { lmsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const raw = String(value).slice(0, 10);
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return raw;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function EnrollmentStatusBadge({
  code,
  name,
}: {
  code?: string | null;
  name?: string | null;
}) {
  const key = (code || "").toLowerCase();
  const style =
    key === "active"
      ? { pill: "pill-good", dot: "bg-primary-dark" }
      : key === "reserved"
        ? { pill: "pill-warn", dot: "bg-amber-700" }
        : key === "dropped"
          ? { pill: "pill-danger", dot: "bg-red-800" }
          : { pill: "pill-neutral", dot: "bg-on-surface-variant" };
  return (
    <span className={`pill ${style.pill}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} aria-hidden />
      {name || code || "—"}
    </span>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium text-on-surface-variant">{label}</div>
      <div className="break-words text-sm font-semibold text-foreground">
        {value?.trim() || "—"}
      </div>
    </div>
  );
}

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { can, isAdmin } = usePermissions();
  const canCreateStudents = can("students.create");
  const canUpdateClasses = can("classes.update");
  const [data, setData] = useState<any>(null);
  const [missing, setMissing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [statusCode, setStatusCode] = useState("active");
  const [masterQuery, setMasterQuery] = useState("");
  const deferredQuery = useDeferredValue(masterQuery);
  const [masters, setMasters] = useState<any[]>([]);
  const [pending, startTransition] = useTransition();
  const [endPending, setEndPending] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const { items: statuses } = useCatalog("student-statuses");

  function load() {
    lmsApi
      .classDetail(id)
      .then((res) => setData(res.data))
      .catch((e) => {
        if (e?.statusCode === 404) {
          setMissing(true);
          return;
        }
        toast.error(e.message);
      });
  }

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    const qs = deferredQuery
      ? `?q=${encodeURIComponent(deferredQuery)}&limit=20`
      : "?limit=20";
    lmsApi.students(qs).then((res) => setMasters(res.data || [])).catch(() => {});
  }, [deferredQuery]);

  const teacherLine = useMemo(() => {
    const teachers = Array.isArray(data?.teachers) ? data.teachers : [];
    const main = teachers
      .filter((t: { role?: string }) => t.role !== "ta")
      .map((t: { name?: string; email?: string }) => t.name || t.email)
      .filter(Boolean);
    const tas = teachers
      .filter((t: { role?: string }) => t.role === "ta")
      .map((t: { name?: string; email?: string }) => t.name || t.email)
      .filter(Boolean);
    if (!main.length && !tas.length) return "—";
    const parts: string[] = [];
    if (main.length) parts.push(main.join(", "));
    if (tas.length) parts.push(`TG: ${tas.join(", ")}`);
    return parts.join(" - ");
  }, [data?.teachers]);

  const scheduleLine = useMemo(() => {
    const parts = [data?.schedule, data?.time].filter(Boolean);
    return parts.length ? parts.join(" - ") : "—";
  }, [data?.schedule, data?.time]);

  if (missing) {
    notFound();
  }

  function addStudent(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (mode === "existing") {
          if (!studentId) {
            toast.error("Chọn học viên");
            return;
          }
          await lmsApi.createEnrollment(id, {
            student_id: Number(studentId),
            status: statusCode,
          });
        } else {
          await lmsApi.createEnrollment(id, {
            full_name: studentName,
            status: statusCode,
          });
        }
        setStudentId("");
        setStudentName("");
        setShowAdd(false);
        toast.success("Đã thêm học viên vào lớp");
        load();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Lỗi thêm học viên");
      }
    });
  }

  async function updateStatus(enrollmentId: number, status: string) {
    try {
      await lmsApi.updateEnrollment(id, enrollmentId, { status });
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function endClass() {
    setEndPending(true);
    try {
      await lmsApi.endClass(id);
      toast.success("Đã kết thúc lớp");
      setConfirmEnd(false);
      load();
    } catch (err: any) {
      toast.error(err.message || "Không thể kết thúc lớp");
    } finally {
      setEndPending(false);
    }
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-surface-low" />
        <div className="h-28 animate-pulse rounded-xl bg-surface-low" />
        <div className="h-64 animate-pulse rounded-xl bg-surface-low" />
      </div>
    );
  }

  const students = data.students || [];
  const studentCount = data.student_count ?? students.length;

  return (
    <div className="flex min-h-[calc(100dvh-6.5rem)] w-full flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_1px_12px_rgba(0,0,0,0.06)]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Lớp {data.code}
        </h1>
        <Tooltip content="Đóng / Quay lại danh sách" side="bottom">
          <button
            type="button"
            className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-low hover:text-foreground"
            aria-label="Đóng"
            onClick={() => router.push("/classes")}
          >
            <X className="h-5 w-5" />
          </button>
        </Tooltip>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5 sm:p-6">
        {/* Class meta */}
        <div className="rounded-xl border border-border/70 bg-surface-low/50 px-4 py-3 sm:px-5 sm:py-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
            <InfoItem label="Khóa học" value={data.course} />
            <InfoItem label="Chương trình" value={data.program} />
            <InfoItem label="Lịch học" value={scheduleLine} />
            <InfoItem label="Ngày khai giảng" value={formatDate(data.start_date)} />
            <InfoItem label="Ngày kết thúc" value={formatDate(data.end_date)} />
            <InfoItem label="Phòng" value={data.room} />
          </div>
          <div className="mt-3 border-t border-border/50 pt-3 text-sm">
            <span className="text-on-surface-variant">Giáo viên: </span>
            <span className="font-medium text-foreground">{teacherLine}</span>
          </div>
        </div>

        {data.is_locked ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Lớp đã khóa — không thể chỉnh sửa nội dung (học viên, điểm danh, tiến độ, đánh giá).
          </div>
        ) : null}

        {/* Students */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground">
              Danh sách học viên ({studentCount})
            </h2>
            {!data.is_locked ? (
              <Tooltip content="Thêm học viên vào lớp">
                <button
                  type="button"
                  className="btn btn-primary !py-1.5 text-xs"
                  onClick={() => setShowAdd((v) => !v)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Thêm học viên
                </button>
              </Tooltip>
            ) : null}
          </div>

          {showAdd && !data.is_locked ? (
            <form
              onSubmit={addStudent}
              className="mb-4 space-y-2 rounded-xl border border-border bg-surface-low/40 p-3"
            >
              <div className="flex flex-wrap gap-2 text-sm">
                <button
                  type="button"
                  className={cn("btn !py-1", mode === "existing" ? "btn-primary" : "btn-ghost")}
                  onClick={() => setMode("existing")}
                >
                  Chọn HV có sẵn
                </button>
                {canCreateStudents ? (
                  <button
                    type="button"
                    className={cn("btn !py-1", mode === "new" ? "btn-primary" : "btn-ghost")}
                    onClick={() => setMode("new")}
                  >
                    Thêm HV mới
                  </button>
                ) : null}
              </div>
              {mode === "existing" ? (
                <>
                  <SearchField
                    placeholder="Tìm học viên master..."
                    value={masterQuery}
                    onChange={(e) => setMasterQuery(e.target.value)}
                    type="text"
                  />
                  <select
                    className="input"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    required
                  >
                    <option value="">— Chọn học viên —</option>
                    {masters.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}
                        {s.parent_phone ? ` · ${s.parent_phone}` : ""}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <input
                  className="input"
                  placeholder="Họ tên học viên mới"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  required
                />
              )}
              <select
                className="input"
                value={statusCode}
                onChange={(e) => setStatusCode(e.target.value)}
              >
                {statuses.map((s) => (
                  <option key={s.id} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={pending}>
                  Thêm vào lớp
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowAdd(false)}
                >
                  Hủy
                </button>
              </div>
            </form>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/70">
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-primary-soft/40 text-xs font-semibold text-primary-dark">
                    <th className="whitespace-nowrap px-4 py-2.5">Học viên</th>
                    <th className="whitespace-nowrap px-4 py-2.5">SĐT phụ huynh</th>
                    <th className="whitespace-nowrap px-4 py-2.5">Trạng thái</th>
                    <th className="whitespace-nowrap px-4 py-2.5 pr-4 text-right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {students.map((s: any) => (
                    <tr key={s.enrollment_id || s.id} className="bg-surface">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {s.full_name}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {s.parent_phone || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {!data.is_locked ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <EnrollmentStatusBadge code={s.status} name={s.status_name} />
                            <select
                              className="input max-w-[9rem] !h-8 !py-0 text-xs"
                              aria-label={`Đổi trạng thái ${s.full_name}`}
                              value={s.status || "active"}
                              onChange={(e) => updateStatus(s.enrollment_id, e.target.value)}
                            >
                              {statuses.map((st) => (
                                <option key={st.id} value={st.code}>
                                  {st.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <EnrollmentStatusBadge code={s.status} name={s.status_name} />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Tooltip content="Xem hồ sơ học viên">
                          <Link
                            href={`/students?student_id=${s.student_id || s.id}`}
                            className="btn btn-ghost !border !border-border !bg-surface !px-2.5 !py-1 text-xs"
                          >
                            Xem hồ sơ
                          </Link>
                        </Tooltip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!students.length ? (
              <p className="py-8 text-center text-sm text-on-surface-variant">
                Chưa có học viên trong lớp.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border/60 bg-surface-low/30 px-5 py-4 sm:px-6">
        <Tooltip content="Quay lại danh sách lớp" side="top">
          <button
            type="button"
            className="btn btn-ghost !border !border-border !bg-surface"
            onClick={() => router.push("/classes")}
          >
            Đóng
          </button>
        </Tooltip>
        <Tooltip content="Mở trang điểm danh lớp này" side="top">
          <Link
            href={`/attendance?class_id=${data.id}`}
            className="btn btn-ghost !border !border-border !bg-surface"
          >
            <CalendarCheck className="h-4 w-4" />
            Điểm danh
          </Link>
        </Tooltip>
        {canUpdateClasses && !data.is_locked ? (
          <Tooltip content="Chỉnh sửa thông tin lớp" side="top">
            <Link href={`/classes?edit=${data.id}`} className="btn btn-primary">
              <Pencil className="h-4 w-4" />
              Sửa lớp
            </Link>
          </Tooltip>
        ) : null}
        {canUpdateClasses && !data.is_locked ? (
          <Tooltip content="Kết thúc và khóa lớp" side="top">
            <button
              type="button"
              className="btn !border !border-danger/40 !bg-surface !text-danger hover:!bg-danger-container"
              onClick={() => setConfirmEnd(true)}
            >
              <XCircle className="h-4 w-4" />
              Kết thúc lớp
            </button>
          </Tooltip>
        ) : null}
        {isAdmin && data.is_locked ? (
          <span className="text-xs text-on-surface-variant">
            Lớp đã khóa — mở lại từ danh sách lớp nếu cần.
          </span>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmEnd}
        title="Kết thúc lớp"
        description={`Xác nhận kết thúc lớp ${data.code}? Lớp sẽ bị khóa chỉnh sửa.`}
        confirmLabel="Kết thúc lớp"
        variant="danger"
        pending={endPending}
        onCancel={() => {
          if (!endPending) setConfirmEnd(false);
        }}
        onConfirm={() => void endClass()}
      />
    </div>
  );
}
