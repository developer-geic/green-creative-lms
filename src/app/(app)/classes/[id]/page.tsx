"use client";

import { FormEvent, useDeferredValue, useEffect, useState, useTransition } from "react";
import { notFound, useParams } from "next/navigation";
import { toast } from "sonner";
import { useCatalog } from "@/hooks/useCatalog";
import { usePermissions } from "@/hooks/usePermissions";
import { SearchField } from "@/components/SearchField";
import { lmsApi } from "@/lib/api";

export default function ClassDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { can } = usePermissions();
  const canCreateStudents = can("students.create");
  const [data, setData] = useState<any>(null);
  const [missing, setMissing] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [statusCode, setStatusCode] = useState("active");
  const [masterQuery, setMasterQuery] = useState("");
  const deferredQuery = useDeferredValue(masterQuery);
  const [masters, setMasters] = useState<any[]>([]);
  const [pending, startTransition] = useTransition();
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

  if (!data) return <div>Đang tải...</div>;

  const startLabel = data.start_date
    ? String(data.start_date).slice(0, 10).split("-").reverse().join("/")
    : "";
  const endLabel = data.end_date
    ? String(data.end_date).slice(0, 10).split("-").reverse().join("/")
    : "";
  const dateLabel =
    startLabel && endLabel
      ? `${startLabel} – ${endLabel}`
      : startLabel
        ? `Từ ${startLabel}`
        : endLabel
          ? `Đến ${endLabel}`
          : "";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-primary-dark">{data.code}</h1>
        <p className="text-sm text-slate-500">
          {[data.course || "—", data.program || "—", data.schedule, data.time, data.room, dateLabel]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="mt-2">
          <span
            className={`pill ${
              data.status === "active" ? "pill-good" : data.status === "ended" ? "pill-warn" : "pill-neutral"
            }`}
          >
            {data.status === "active"
              ? "Đang hoạt động"
              : data.status === "ended"
                ? "Đã kết thúc"
                : "Ngừng hoạt động"}
          </span>
        </div>
      </div>

      {data.is_locked && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Lớp đã khóa — không thể chỉnh sửa nội dung (học viên, điểm danh, tiến độ, đánh giá).
        </div>
      )}

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Học viên ({data.student_count})</h2>
        </div>
        {!data.is_locked && (
          <form onSubmit={addStudent} className="mb-4 space-y-2 rounded-lg border border-border p-3">
            <div className="flex gap-2 text-sm">
              <button
                type="button"
                className={`btn !py-1 ${mode === "existing" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setMode("existing")}
              >
                Chọn HV có sẵn
              </button>
              {canCreateStudents ? (
                <button
                  type="button"
                  className={`btn !py-1 ${mode === "new" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setMode("new")}
                >
                  Thêm HV mới
                </button>
              ) : null}            </div>
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
            <button className="btn btn-primary" disabled={pending}>
              Thêm vào lớp
            </button>
          </form>
        )}
        <div className="space-y-2">
          {(data.students || []).map((s: any) => (
            <div key={s.enrollment_id || s.id} className="flex items-center justify-between gap-2 border-b border-border py-2 text-sm">
              <div>
                <div className="font-medium">{s.full_name}</div>
                <div className="text-xs text-slate-500">{s.parent_phone || "—"}</div>
              </div>
              {!data.is_locked ? (
                <select
                  className="input max-w-[160px] !py-1 text-xs"
                  value={s.status || "active"}
                  onChange={(e) => updateStatus(s.enrollment_id, e.target.value)}
                >
                  {statuses.map((st) => (
                    <option key={st.id} value={st.code}>
                      {st.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="pill pill-neutral">{s.status_name || s.status}</span>
              )}
            </div>
          ))}
          {!data.students?.length && (
            <p className="py-4 text-center text-sm text-slate-500">Chưa có học viên trong lớp.</p>
          )}
        </div>
      </div>
    </div>
  );
}
