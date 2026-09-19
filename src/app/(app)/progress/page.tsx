"use client";

import { Suspense, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SelectField } from "@/components/SelectField";
import { useCatalog } from "@/hooks/useCatalog";
import { lmsApi } from "@/lib/api";
import { buildQuery, cn, toLocalDateKey } from "@/lib/utils";

const HW_OPTIONS = [
  {
    value: "",
    label: "BTVN",
    className: "bg-surface-low text-on-surface-variant",
  },
  {
    value: "done",
    label: "Hoàn thành",
    className: "bg-[#ecfdf5] text-[#065f46]",
  },
  {
    value: "missing",
    label: "Chưa HT",
    className: "bg-[#fef2f2] text-[#991b1b]",
  },
];

const HW_SELECT_OPTIONS = HW_OPTIONS.map((o) => ({
  value: o.value,
  label: o.label,
  optionClassName: o.className,
}));

const HW_LABEL: Record<string, string> = {
  "": "Trống",
  done: "Hoàn thành",
  missing: "Chưa HT",
};

const WEEKDAY_VI = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"] as const;

type PendingCell = {
  studentId: number;
  studentName: string;
  date: string;
  sessionId: number;
  fromHomework: string;
  toHomework: string;
  fromAbsorption: string;
  toAbsorption: string;
};

type DiscardIntent =
  | { kind: "class"; classId: string }
  | { kind: "month"; year: number; month: number }
  | { kind: "reload" };

function hwClass(status: string) {
  return HW_OPTIONS.find((o) => o.value === status)?.className || HW_OPTIONS[0].className;
}

function pendingKey(studentId: number, date: string) {
  return `${studentId}:${date}`;
}

function formatSessionHeader(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return {
    weekday: WEEKDAY_VI[date.getDay()],
    day: String(d).padStart(2, "0"),
    month: String(m).padStart(2, "0"),
    year: String(y),
  };
}

function shortDate(iso: string) {
  const h = formatSessionHeader(iso);
  return `${h.day}/${h.month}`;
}

function ProgressContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = new Date();
  const [classes, setClasses] = useState<
    Array<{ id: number; code: string; schedule?: string; time?: string; room?: string }>
  >([]);
  const [classId, setClassId] = useState(searchParams.get("class_id") || "");
  const [year, setYear] = useState(Number(searchParams.get("year") || now.getFullYear()));
  const [month, setMonth] = useState(Number(searchParams.get("month") || now.getMonth() + 1));
  const [data, setData] = useState<{
    class?: {
      is_locked?: boolean;
      code?: string;
      schedule?: string;
      time?: string;
      room?: string;
      course?: string;
    };
    sessions?: Array<{ id: number; session_date: string }>;
    dates?: string[];
    grid?: Array<{
      student: { id: number; full_name: string; code?: string };
      cells?: Record<
        string,
        { homework?: string | null; absorption?: string | null }
      >;
      stats?: { rate?: number | null; done?: number; homework_total?: number };
    }>;
  } | null>(null);
  const [pending, setPending] = useState<Record<string, PendingCell>>({});
  const [saving, setSaving] = useState(false);
  const [discardIntent, setDiscardIntent] = useState<DiscardIntent | null>(null);
  const [, startTransition] = useTransition();
  const { items: absorptionLevels } = useCatalog("absorption-levels");

  const pendingList = useMemo(() => Object.values(pending), [pending]);
  const dirty = pendingList.length > 0;

  const absorptionOptions = useMemo(
    () => [
      { value: "", label: "Tiếp thu", optionClassName: "bg-surface-low text-on-surface-variant" },
      ...absorptionLevels.map((level) => ({
        value: level.code,
        label: level.name,
      })),
    ],
    [absorptionLevels],
  );

  const absorptionLabel = useMemo(() => {
    const map: Record<string, string> = { "": "Trống" };
    absorptionLevels.forEach((l) => {
      map[l.code] = l.name;
    });
    return map;
  }, [absorptionLevels]);

  useEffect(() => {
    lmsApi.classes("?limit=100").then((res) => {
      const list = Array.isArray(res.data) ? res.data : [];
      setClasses(list);
      if (!classId && list[0]) setClassId(String(list[0].id));
    });
  }, []);

  function load(cid = classId, y = year, m = month) {
    if (!cid) return;
    const query = buildQuery({ year: y, month: m, class_id: cid });
    router.replace(`/progress${query}`);
    lmsApi
      .progress(cid, buildQuery({ year: y, month: m }))
      .then((res) => startTransition(() => setData(res.data)))
      .catch((e) => toast.error(e.message));
  }

  useEffect(() => {
    if (classId) load(classId);
  }, [classId]);

  const sessionByDate = useMemo(() => {
    const map: Record<string, number> = {};
    (data?.sessions || []).forEach((s) => {
      const key = toLocalDateKey(s.session_date);
      if (key) map[key] = s.id;
    });
    return map;
  }, [data]);

  const selectedClass = classes.find((c) => String(c.id) === classId);

  const homeworkDoneRate = useMemo(() => {
    const rows = data?.grid || [];
    if (!rows.length) return null;
    let done = 0;
    let total = 0;
    rows.forEach((row) => {
      (data?.dates || []).forEach((d) => {
        const key = pendingKey(row.student.id, d);
        const hw = pending[key]?.toHomework ?? row.cells?.[d]?.homework ?? "";
        if (hw) {
          total++;
          if (hw === "done") done++;
        }
      });
    });
    return total ? Math.round((done / total) * 100) : null;
  }, [data, pending]);

  function cellHomework(studentId: number, date: string, server?: string | null) {
    const key = pendingKey(studentId, date);
    if (pending[key]) return pending[key].toHomework;
    return server || "";
  }

  function cellAbsorption(studentId: number, date: string, server?: string | null) {
    const key = pendingKey(studentId, date);
    if (pending[key]) return pending[key].toAbsorption;
    return server || "";
  }

  function queueChange(
    studentId: number,
    studentName: string,
    date: string,
    patch: { homework?: string; absorption?: string },
    serverHomework: string,
    serverAbsorption: string,
  ) {
    const sessionId = sessionByDate[date];
    if (!sessionId) {
      toast.error("Không tìm thấy buổi học");
      return;
    }
    const key = pendingKey(studentId, date);
    const existing = pending[key];
    const fromHomework = existing?.fromHomework ?? serverHomework;
    const fromAbsorption = existing?.fromAbsorption ?? serverAbsorption;
    const toHomework = patch.homework !== undefined ? patch.homework : (existing?.toHomework ?? serverHomework);
    const toAbsorption =
      patch.absorption !== undefined ? patch.absorption : (existing?.toAbsorption ?? serverAbsorption);

    setPending((prev) => {
      const next = { ...prev };
      if (toHomework === fromHomework && toAbsorption === fromAbsorption) {
        delete next[key];
      } else {
        next[key] = {
          studentId,
          studentName,
          date,
          sessionId,
          fromHomework,
          toHomework,
          fromAbsorption,
          toAbsorption,
        };
      }
      return next;
    });
  }

  function clearPending() {
    setPending({});
  }

  function requestDiscard(intent: DiscardIntent) {
    if (!dirty) {
      applyDiscard(intent);
      return;
    }
    setDiscardIntent(intent);
  }

  function applyDiscard(intent: DiscardIntent) {
    clearPending();
    setDiscardIntent(null);
    if (intent.kind === "class") {
      setClassId(intent.classId);
      return;
    }
    if (intent.kind === "month") {
      setMonth(intent.month);
      setYear(intent.year);
      load(classId, intent.year, intent.month);
      return;
    }
    load();
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
    requestDiscard({ kind: "month", year: y, month: m });
  }

  async function saveAll() {
    if (!pendingList.length) return;
    setSaving(true);
    try {
      const bySession = new Map<
        number,
        Array<{ student_id: number; homework: string | null; absorption: string | null }>
      >();
      for (const cell of pendingList) {
        const list = bySession.get(cell.sessionId) || [];
        list.push({
          student_id: cell.studentId,
          homework: cell.toHomework || null,
          absorption: cell.toAbsorption || null,
        });
        bySession.set(cell.sessionId, list);
      }
      await Promise.all(
        [...bySession.entries()].map(([sessionId, records]) =>
          lmsApi.upsertProgress(sessionId, records),
        ),
      );
      toast.success(`Đã lưu ${pendingList.length} thay đổi tiến độ`);
      clearPending();
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Lỗi lưu tiến độ");
    } finally {
      setSaving(false);
    }
  }

  const classMeta = selectedClass || data?.class;

  return (
    <div className={cn("flex w-full flex-col gap-6", dirty && "pb-28")}>
      <div className="relative overflow-hidden rounded-xl bg-surface p-6 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div className="flex flex-col gap-1.5">
            <div className="relative inline-flex max-w-xl items-center">
              <SelectField
                aria-label="Chọn lớp học"
                className="min-w-[14rem]"
                value={classId}
                options={classes.map((c) => ({
                  value: String(c.id),
                  label: `Lớp: ${c.code}`,
                }))}
                onChange={(next) => {
                  if (next === classId) return;
                  requestDiscard({ kind: "class", classId: next });
                }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant">
              <span>{classMeta?.schedule || "—"}</span>
              <span>•</span>
              <span>{classMeta?.time || "—"}</span>
              <span>•</span>
              <span>{classMeta?.room || "—"}</span>
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
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => requestDiscard({ kind: "reload" })}
            >
              <RefreshCw className="h-4 w-4" />
              Làm mới
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
              <div className="text-[11px] uppercase text-on-surface-variant">BTVN hoàn thành</div>
              <div className="text-xl font-semibold tracking-tight text-primary">
                {homeworkDoneRate == null ? "—" : `${homeworkDoneRate}%`}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1 rounded bg-[#ecfdf5] px-2.5 py-1 text-[#065f46]">
              Hoàn thành
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-[#fef2f2] px-2.5 py-1 text-[#991b1b]">
              Chưa HT
            </span>
            {absorptionLevels.slice(0, 3).map((l) => (
              <span
                key={l.id}
                className="inline-flex items-center gap-1 rounded bg-surface-high px-2.5 py-1 text-on-surface-variant"
              >
                {l.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {data?.class?.is_locked ? (
        <div className="rounded-lg bg-[#fffbeb] px-3 py-2 text-sm text-[#92400e]">
          Lớp đã khóa - chỉ xem, không ghi tiến độ mới.
        </div>
      ) : null}

      {data ? (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-primary/10 bg-surface shadow-[0_8px_24px_rgba(0,105,72,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/10 bg-gradient-to-r from-primary/[0.06] to-transparent px-4 py-3.5 sm:px-5">
            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
              <div className="h-5 w-1.5 shrink-0 rounded-full bg-primary" />
              <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                Lịch tiến độ
              </h2>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary-dark">
                {data.grid?.length || 0} học viên
              </span>
            </div>
            <p className="text-xs text-on-surface-variant md:hidden">Vuốt ngang để xem buổi</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 min-w-[200px] bg-primary-dark px-4 py-3.5 text-left shadow-[4px_0_12px_rgba(0,81,55,0.18)]">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-on-primary/80">
                      Học viên
                    </span>
                  </th>
                  {(data.dates || []).map((d) => {
                    const h = formatSessionHeader(d);
                    return (
                      <th
                        key={d}
                        className="min-w-[140px] bg-primary px-2 py-3 text-center text-on-primary"
                      >
                        <span className="block text-[11px] font-bold uppercase tracking-wide text-primary-soft">
                          {h.weekday}
                        </span>
                        <span className="mt-0.5 block text-sm font-semibold leading-tight">
                          {h.day}/{h.month}
                        </span>
                        <span className="block text-[10px] font-medium text-on-primary/75">
                          {h.year}
                        </span>
                      </th>
                    );
                  })}
                  <th className="min-w-[88px] bg-primary-container px-3 py-3.5 text-center text-on-primary">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-on-primary/85">
                      % BTVN
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {(data.grid || []).map((row, idx) => (
                  <tr
                    key={row.student.id}
                    className="group border-b border-surface-low transition-colors last:border-b-0 hover:bg-primary/[0.03]"
                  >
                    <td className="sticky left-0 z-10 bg-surface px-4 py-3 shadow-[4px_0_12px_rgba(0,0,0,0.04)] group-hover:bg-[#f7fbf9]">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft/60 text-[11px] font-bold text-primary-dark">
                          {String(idx + 1).padStart(2, "0")}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-foreground">
                            {row.student.full_name}
                          </div>
                          {row.student.code ? (
                            <div className="font-mono text-[11px] text-primary">{row.student.code}</div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    {(data.dates || []).map((d) => {
                      const serverHw = row.cells?.[d]?.homework || "";
                      const serverAbs = row.cells?.[d]?.absorption || "";
                      const homework = cellHomework(row.student.id, d, serverHw);
                      const absorption = cellAbsorption(row.student.id, d, serverAbs);
                      const isDirty = !!pending[pendingKey(row.student.id, d)];
                      return (
                        <td key={d} className="space-y-1.5 px-1.5 py-2.5">
                          <SelectField
                            size="sm"
                            aria-label={`BTVN ${row.student.full_name} ngày ${d}`}
                            className="w-full"
                            triggerClassName={cn(
                              hwClass(homework),
                              "justify-center border border-transparent",
                              isDirty && "ring-2 ring-primary/35",
                            )}
                            disabled={data.class?.is_locked}
                            value={homework}
                            options={HW_SELECT_OPTIONS}
                            onChange={(to) =>
                              queueChange(
                                row.student.id,
                                row.student.full_name,
                                d,
                                { homework: to },
                                serverHw,
                                serverAbs,
                              )
                            }
                          />
                          <SelectField
                            size="sm"
                            aria-label={`Tiếp thu ${row.student.full_name} ngày ${d}`}
                            className="w-full"
                            triggerClassName={cn(
                              "justify-center border border-transparent bg-surface-low",
                              isDirty && "ring-2 ring-primary/35",
                            )}
                            disabled={data.class?.is_locked}
                            value={absorption}
                            options={absorptionOptions}
                            onChange={(to) =>
                              queueChange(
                                row.student.id,
                                row.student.full_name,
                                d,
                                { absorption: to },
                                serverHw,
                                serverAbs,
                              )
                            }
                          />
                        </td>
                      );
                    })}
                    <td className="bg-surface-low/40 px-3 py-3 text-center">
                      <span
                        className={cn(
                          "inline-flex min-w-[3rem] items-center justify-center rounded-md px-2 py-1 text-xs font-bold tabular-nums",
                          row.stats?.rate == null
                            ? "bg-surface-high text-on-surface-variant"
                            : row.stats.rate >= 80
                              ? "bg-[#ecfdf5] text-[#065f46]"
                              : row.stats.rate >= 50
                                ? "bg-[#fffbeb] text-[#92400e]"
                                : "bg-[#fef2f2] text-[#991b1b]",
                        )}
                      >
                        {row.stats?.rate == null ? "-" : `${row.stats.rate}%`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-sm text-on-surface-variant">Chọn lớp để xem tiến độ...</div>
      )}

      {dirty ? (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-surface-high bg-surface/95 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-sm md:left-64">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-end sm:justify-between sm:px-6">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground">
                {pendingList.length} thay đổi chưa lưu
              </div>
              <ul className="mt-1.5 max-h-[7.5rem] space-y-1 overflow-y-auto text-xs text-on-surface-variant">
                {pendingList.map((cell) => (
                  <li key={`${cell.studentId}:${cell.date}`}>
                    <span className="font-medium text-foreground">{cell.studentName}</span>
                    {" · "}
                    {shortDate(cell.date)}
                    {cell.fromHomework !== cell.toHomework ? (
                      <>
                        {" · BTVN "}
                        <span className={cn("rounded px-1 py-0.5", hwClass(cell.fromHomework))}>
                          {HW_LABEL[cell.fromHomework] ?? "Trống"}
                        </span>
                        {" → "}
                        <span className={cn("rounded px-1 py-0.5", hwClass(cell.toHomework))}>
                          {HW_LABEL[cell.toHomework] ?? "Trống"}
                        </span>
                      </>
                    ) : null}
                    {cell.fromAbsorption !== cell.toAbsorption ? (
                      <>
                        {" · Tiếp thu "}
                        <span className="rounded bg-surface-high px-1 py-0.5">
                          {absorptionLabel[cell.fromAbsorption] ?? "Trống"}
                        </span>
                        {" → "}
                        <span className="rounded bg-surface-high px-1 py-0.5">
                          {absorptionLabel[cell.toAbsorption] ?? "Trống"}
                        </span>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={saving}
                onClick={clearPending}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving}
                onClick={() => void saveAll()}
              >
                <Save className="h-4 w-4" />
                {saving ? "Đang lưu..." : "Lưu tất cả"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {discardIntent ? (
        <ConfirmDialog
          open
          title="Bỏ thay đổi chưa lưu?"
          description="Bạn có thay đổi tiến độ chưa lưu. Tiếp tục sẽ hủy các thay đổi đó."
          confirmLabel="Bỏ thay đổi"
          variant="danger"
          onCancel={() => setDiscardIntent(null)}
          onConfirm={() => applyDiscard(discardIntent)}
        />
      ) : null}
    </div>
  );
}

export default function ProgressPage() {
  return (
    <Suspense fallback={<div className="text-sm text-on-surface-variant">Đang tải...</div>}>
      <ProgressContent />
    </Suspense>
  );
}
