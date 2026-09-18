"use client";

import dynamic from "next/dynamic";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ComponentType,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  CalendarCheck,
  DoorOpen,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { StatsFilters } from "@/components/stats/StatsFilters";
import { lmsApi } from "@/lib/api";
import { buildQuery, cn } from "@/lib/utils";
import type { LmsUser, StatsByTeacher, StatsPayload } from "@/types/lms";

const StatsCharts = dynamic(
  () => import("@/components/stats/StatsCharts").then((m) => m.StatsCharts),
  {
    ssr: false,
    loading: () => <ChartsSkeleton />,
  },
);

function ChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="card h-80 animate-pulse bg-surface-low !p-4" />
      <div className="card h-80 animate-pulse bg-surface-low !p-4" />
      <div className="card h-80 animate-pulse bg-surface-low !p-4 xl:col-span-2" />
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="h-10 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="card h-48 animate-pulse bg-surface-low !p-4" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-28 animate-pulse bg-surface-low" />
        ))}
      </div>
      <ChartsSkeleton />
    </div>
  );
}

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

function StudentRatioBar({ active, total }: { active: number; total: number }) {
  const pct = total > 0 ? Math.round((active / total) * 100) : 0;
  return (
    <div className="flex min-w-[7rem] flex-col gap-1">
      <span className="text-sm font-medium tabular-nums">
        {active}/{total}
      </span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-low">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  muted,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "card flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5",
        muted && "opacity-70",
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-on-surface-variant">{label}</span>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-low text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className="text-4xl font-bold leading-none text-foreground">{value}</span>
        {hint ? <span className="pill pill-neutral text-right">{hint}</span> : null}
      </div>
    </div>
  );
}

function TeacherTable({ rows }: { rows: StatsByTeacher[] }) {
  if (!rows.length) {
    return (
      <div className="rounded-xl bg-surface px-4 py-10 text-center text-sm text-on-surface-variant shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        Không có dữ liệu theo bộ lọc.
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-surface shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-low text-xs font-semibold text-on-surface-variant">
              <th className="whitespace-nowrap px-4 py-3">Giáo viên</th>
              <th className="whitespace-nowrap px-4 py-3">Số lớp</th>
              <th className="whitespace-nowrap px-4 py-3">Đang hoạt động</th>
              <th className="whitespace-nowrap px-4 py-3">Đã kết thúc</th>
              <th className="whitespace-nowrap px-4 py-3 pr-6">Học viên</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-low text-foreground">
            {rows.map((r) => (
              <tr key={r.teacher_id ?? r.teacher_name}>
                <td className="px-4 py-3 font-medium">{r.teacher_name}</td>
                <td className="px-4 py-3 tabular-nums">{r.classes}</td>
                <td className="px-4 py-3 tabular-nums">{r.active}</td>
                <td className="px-4 py-3 tabular-nums">{r.ended}</td>
                <td className="px-4 py-3 pr-6">
                  <StudentRatioBar active={r.students_active} total={r.students} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const yearNow = useMemo(() => new Date().getFullYear(), []);
  const yearOptions = useMemo(() => [yearNow - 1, yearNow, yearNow + 1], [yearNow]);

  const [teachers, setTeachers] = useState<LmsUser[]>([]);
  const [teacherIds, setTeacherIds] = useState<string[]>(() =>
    searchParams.getAll("teacher_ids[]"),
  );
  const [years, setYears] = useState<string[]>(() => searchParams.getAll("years[]"));
  const [months, setMonths] = useState<string[]>(() => searchParams.getAll("months[]"));
  const [data, setData] = useState<StatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  const fetchStats = useCallback(
    async (ids: string[], ys: string[], ms: string[]) => {
      const query = buildQuery({
        teacher_ids: ids,
        years: ys,
        months: ms,
      });
      router.replace(`/stats${query}`);
      setApplying(true);
      try {
        const res = await lmsApi.stats(query);
        startTransition(() => {
          setData(res.data as StatsPayload);
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Không tải được thống kê");
      } finally {
        setApplying(false);
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [usersRes] = await Promise.all([
          lmsApi.users("?limit=100"),
          fetchStats(teacherIds, years, months),
        ]);
        if (cancelled) return;
        const list = (usersRes.data || []) as LmsUser[];
        setTeachers(list.filter((u) => u.role === "teacher"));
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function onToggleTeacher(id: string) {
    setTeacherIds((prev) => toggleValue(prev, id));
  }
  function onToggleYear(year: string) {
    setYears((prev) => toggleValue(prev, year));
  }
  function onToggleMonth(month: string) {
    setMonths((prev) => toggleValue(prev, month));
  }

  function onClear() {
    setTeacherIds([]);
    setYears([]);
    setMonths([]);
    void fetchStats([], [], []);
  }

  function onApply() {
    void fetchStats(teacherIds, years, months);
  }

  if (loading && !data) {
    return <PageSkeleton />;
  }

  const summary = data?.summary;
  const byTeacher = data?.by_teacher || [];

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">Thống kê</h1>
          <p className="text-sm text-on-surface-variant">
            Báo cáo lớp và học viên theo giáo viên. Chọn năm/tháng để xem buổi điểm danh.
          </p>
        </div>
      </div>

      <StatsFilters
        teachers={teachers}
        teacherIds={teacherIds}
        years={years}
        months={months}
        yearOptions={yearOptions}
        loading={applying}
        onToggleTeacher={onToggleTeacher}
        onToggleYear={onToggleYear}
        onToggleMonth={onToggleMonth}
        onClear={onClear}
        onApply={onApply}
      />

      {summary ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Tổng lớp"
            value={summary.total_classes}
            hint={`${summary.ended_classes} kết thúc`}
            icon={BookOpen}
          />
          <KpiCard
            label="Đang hoạt động"
            value={summary.active_classes}
            hint={`/ ${summary.total_classes} lớp`}
            icon={DoorOpen}
          />
          <KpiCard
            label="Học viên"
            value={summary.total_students}
            hint="Tổng enrollment"
            icon={Users}
          />
          <KpiCard
            label="Buổi điểm danh"
            value={
              summary.has_time_filter ? (summary.attendance_sessions ?? 0) : "—"
            }
            hint={
              summary.has_time_filter
                ? "Theo năm/tháng"
                : "Chọn năm/tháng để xem"
            }
            icon={CalendarCheck}
            muted={!summary.has_time_filter}
          />
        </div>
      ) : null}

      {summary ? <StatsCharts summary={summary} byTeacher={byTeacher} /> : null}

      <div className="space-y-2">
        <h2 className="text-sm font-bold text-foreground">Chi tiết theo giáo viên</h2>
        <TeacherTable rows={byTeacher} />
      </div>
    </div>
  );
}

export default function StatsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <StatsContent />
    </Suspense>
  );
}
