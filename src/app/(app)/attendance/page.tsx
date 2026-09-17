"use client";

import { Suspense, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { toast } from "sonner";
import { lmsApi } from "@/lib/api";
import { buildQuery, cn } from "@/lib/utils";

const ATT_OPTIONS = [
  { value: "", label: "— Trống —", className: "bg-surface-low text-on-surface-variant" },
  { value: "present", label: "✓ Có mặt", className: "bg-[#ecfdf5] text-[#065f46]" },
  { value: "excused", label: "✉ Có phép", className: "bg-[#fffbeb] text-[#92400e]" },
  { value: "unexcused", label: "✕ Không phép", className: "bg-[#fef2f2] text-[#991b1b]" },
];

function optionClass(status: string) {
  return ATT_OPTIONS.find((o) => o.value === status)?.className || ATT_OPTIONS[0].className;
}

function AttendanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = new Date();
  const [classes, setClasses] = useState<Array<{ id: number; code: string; schedule?: string; time?: string; room?: string }>>([]);
  const [classId, setClassId] = useState(searchParams.get("class_id") || "");
  const [year, setYear] = useState(Number(searchParams.get("year") || now.getFullYear()));
  const [month, setMonth] = useState(Number(searchParams.get("month") || now.getMonth() + 1));
  const [data, setData] = useState<{
    class?: { is_locked?: boolean; code?: string };
    sessions?: Array<{ id: number; session_date: string }>;
    dates?: string[];
    grid?: Array<{
      student: { id: number; full_name: string; code?: string };
      cells?: Record<string, { status?: string }>;
      stats?: { rate?: number | null; present?: number; absent?: number };
    }>;
  } | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    lmsApi.classes("?limit=100").then((res) => {
      const list = Array.isArray(res.data) ? res.data : [];
      setClasses(list);
      if (!classId && list[0]) setClassId(String(list[0].id));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function load(cid = classId, y = year, m = month) {
    if (!cid) return;
    const query = buildQuery({ year: y, month: m, class_id: cid });
    router.replace(`/attendance${query}`);
    lmsApi
      .attendance(cid, buildQuery({ year: y, month: m }))
      .then((res) => startTransition(() => setData(res.data)))
      .catch((e) => toast.error(e.message));
  }

  useEffect(() => {
    if (classId) load(classId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const sessionByDate = useMemo(() => {
    const map: Record<string, number> = {};
    (data?.sessions || []).forEach((s) => {
      map[s.session_date?.slice?.(0, 10) || s.session_date] = s.id;
    });
    return map;
  }, [data]);

  const selectedClass = classes.find((c) => String(c.id) === classId);

  const markedSessions = useMemo(() => {
    const dates = data?.dates || [];
    if (!dates.length || !data?.grid?.length) return 0;
    return dates.filter((d) =>
      data.grid!.some((row) => row.cells?.[d]?.status),
    ).length;
  }, [data]);

  async function onChange(studentId: number, date: string, status: string) {
    const sessionId = sessionByDate[date];
    if (!sessionId) return;
    try {
      await lmsApi.upsertAttendance(sessionId, [
        { student_id: studentId, status: status || null },
      ]);
      toast.success("Đã lưu");
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Lỗi lưu điểm danh");
    }
  }

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setMonth(m);
    setYear(y);
    load(classId, y, m);
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="relative overflow-hidden rounded-xl bg-surface p-6 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div className="flex flex-col gap-1.5">
            <div className="relative inline-flex max-w-xl items-center">
              <select
                aria-label="Chọn lớp học"
                className="input h-10 appearance-none pr-8 font-semibold"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Lớp: {c.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant">
              <span>{selectedClass?.schedule || "—"}</span>
              <span>•</span>
              <span>{selectedClass?.time || "—"}</span>
              <span>•</span>
              <span>{selectedClass?.room || "—"}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg bg-surface-low p-1">
              <button
                type="button"
                aria-label="Tháng trước"
                className="rounded p-1 text-on-surface-variant hover:bg-surface-highest hover:text-foreground"
                onClick={() => shiftMonth(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="px-3 text-sm font-semibold text-foreground">
                Tháng {month} / {year}
              </div>
              <button
                type="button"
                aria-label="Tháng sau"
                className="rounded p-1 text-on-surface-variant hover:bg-surface-highest hover:text-foreground"
                onClick={() => shiftMonth(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => load()}>
              <Save className="h-4 w-4" />
              Làm mới / Lưu
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-surface-low/60 p-4">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            <div>
              <div className="text-[11px] uppercase text-on-surface-variant">Buổi trong tháng</div>
              <div className="text-xl font-semibold tracking-tight">
                {data?.dates?.length || 0}{" "}
                <span className="text-xs font-normal text-on-surface-variant">buổi học</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase text-on-surface-variant">Đã điểm danh</div>
              <div className="text-xl font-semibold tracking-tight text-primary">
                {markedSessions}/{data?.dates?.length || 0}{" "}
                <span className="text-xs font-normal text-on-surface-variant">buổi</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1 rounded bg-[#ecfdf5] px-2.5 py-1 text-[#065f46]">
              Có mặt
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-[#fffbeb] px-2.5 py-1 text-[#92400e]">
              Có phép
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-[#fef2f2] px-2.5 py-1 text-[#991b1b]">
              Không phép
            </span>
          </div>
        </div>
      </div>

      {data?.class?.is_locked ? (
        <div className="rounded-lg bg-[#fffbeb] px-3 py-2 text-sm text-[#92400e]">
          Lớp đã khóa — chỉ xem, không ghi điểm danh mới.
        </div>
      ) : null}

      {data ? (
        <div className="flex flex-col overflow-hidden rounded-xl bg-surface shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-low/40 p-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-2 rounded-full bg-primary" />
              <h2 className="text-lg font-semibold text-foreground">Ma trận điểm danh học viên</h2>
              <span className="rounded bg-surface-high px-2 py-0.5 text-[11px] text-on-surface-variant">
                Sĩ số: {data.grid?.length || 0} học viên
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-left text-sm">
              <thead className="bg-surface-low text-xs font-semibold text-on-surface-variant">
                <tr>
                  <th className="sticky left-0 z-10 bg-surface-low px-4 py-3">Học viên</th>
                  {(data.dates || []).map((d) => (
                    <th key={d} className="min-w-[124px] px-2 py-3 text-center">
                      <span className="block font-semibold text-foreground">{d.slice(5)}</span>
                      <span className="font-normal">{d.slice(0, 4)}</span>
                    </th>
                  ))}
                  <th className="bg-surface-high px-4 py-3 text-center">Tổng kết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-low/50">
                {(data.grid || []).map((row, idx) => (
                  <tr key={row.student.id} className="transition-colors hover:bg-surface-low/40">
                    <td className="sticky left-0 z-10 bg-surface px-4 py-2.5 font-semibold">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-high text-[11px] font-bold">
                          {String(idx + 1).padStart(2, "0")}
                        </div>
                        <div>
                          <div>{row.student.full_name}</div>
                          {row.student.code ? (
                            <div className="font-mono text-[11px] text-primary">{row.student.code}</div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    {(data.dates || []).map((d) => {
                      const status = row.cells?.[d]?.status || "";
                      return (
                        <td key={d} className="px-1.5 py-2.5 text-center">
                          <select
                            className={cn(
                              "h-8 w-full cursor-pointer rounded text-center text-[11px] font-semibold outline-none",
                              optionClass(status),
                            )}
                            disabled={data.class?.is_locked}
                            value={status}
                            onChange={(e) => onChange(row.student.id, d, e.target.value)}
                          >
                            {ATT_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                    <td className="bg-surface-low/50 px-4 py-2.5 text-center text-[11px] font-semibold">
                      {row.stats?.rate == null ? "—" : `${row.stats.rate}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-sm text-on-surface-variant">Chọn lớp để xem điểm danh...</div>
      )}
    </div>
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={<div className="text-sm text-on-surface-variant">Đang tải...</div>}>
      <AttendanceContent />
    </Suspense>
  );
}
