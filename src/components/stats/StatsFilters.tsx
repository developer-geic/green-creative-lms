"use client";

import { Filter, RefreshCw, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { SearchField } from "@/components/SearchField";
import { cn } from "@/lib/utils";
import type { LmsUser } from "@/types/lms";

type StatsFiltersProps = {
  teachers: LmsUser[];
  teacherIds: string[];
  years: string[];
  months: string[];
  yearOptions: number[];
  loading?: boolean;
  onToggleTeacher: (id: string) => void;
  onToggleYear: (year: string) => void;
  onToggleMonth: (month: string) => void;
  onClear: () => void;
  onApply: () => void;
};

function Chip({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors active:scale-[0.98]",
        selected
          ? "bg-surface text-primary shadow-sm"
          : "text-on-surface-variant hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function StatsFilters({
  teachers,
  teacherIds,
  years,
  months,
  yearOptions,
  loading,
  onToggleTeacher,
  onToggleYear,
  onToggleMonth,
  onClear,
  onApply,
}: StatsFiltersProps) {
  const [teacherQuery, setTeacherQuery] = useState("");

  const filteredTeachers = useMemo(() => {
    const q = teacherQuery.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) => {
      const label = (t.name || t.email || "").toLowerCase();
      return label.includes(q);
    });
  }, [teachers, teacherQuery]);

  const selectedTeachers = useMemo(
    () => teachers.filter((t) => teacherIds.includes(String(t.id))),
    [teachers, teacherIds],
  );

  const hasFilters = teacherIds.length > 0 || years.length > 0 || months.length > 0;

  return (
    <div className="card flex flex-col gap-4 !p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-foreground">Bộ lọc</h2>
          <p className="text-xs text-on-surface-variant">
            Lọc theo giáo viên, năm và tháng. Để trống = tất cả.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="btn btn-ghost h-10 !px-2"
            title="Xóa bộ lọc"
            disabled={!hasFilters}
            onClick={onClear}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="btn btn-primary h-10"
            disabled={loading}
            onClick={onApply}
          >
            <Filter className="h-4 w-4" />
            Áp dụng
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-2 lg:col-span-5">
          <div className="text-xs font-semibold text-on-surface-variant">Giáo viên</div>
          <SearchField
            placeholder="Tìm giáo viên..."
            value={teacherQuery}
            onChange={(e) => setTeacherQuery(e.target.value)}
            className="w-full"
            wrapperClassName="w-full"
          />
          <div className="max-h-36 overflow-y-auto rounded-lg bg-surface-low p-1.5">
            {filteredTeachers.length === 0 ? (
              <p className="px-2 py-3 text-xs text-on-surface-variant">Không tìm thấy giáo viên.</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {filteredTeachers.map((t) => {
                  const id = String(t.id);
                  const selected = teacherIds.includes(id);
                  return (
                    <Chip key={t.id} selected={selected} onClick={() => onToggleTeacher(id)}>
                      {t.name || t.email}
                    </Chip>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3 lg:col-span-7">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-on-surface-variant">Năm</div>
            <div className="flex flex-wrap gap-1 rounded-lg bg-surface-low p-1.5">
              {yearOptions.map((y) => {
                const value = String(y);
                return (
                  <Chip
                    key={y}
                    selected={years.includes(value)}
                    onClick={() => onToggleYear(value)}
                  >
                    {y}
                  </Chip>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-on-surface-variant">Tháng</div>
            <div className="flex flex-wrap gap-1 rounded-lg bg-surface-low p-1.5">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const value = String(m);
                return (
                  <Chip
                    key={m}
                    selected={months.includes(value)}
                    onClick={() => onToggleMonth(value)}
                    className="min-w-10 justify-center"
                  >
                    T{m}
                  </Chip>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {hasFilters ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
            Đang lọc
          </span>
          {selectedTeachers.map((t) => (
            <button
              key={t.id}
              type="button"
              className="pill pill-good gap-1"
              onClick={() => onToggleTeacher(String(t.id))}
            >
              {t.name || t.email}
              <X className="h-3 w-3" />
            </button>
          ))}
          {years.map((y) => (
            <button
              key={`y-${y}`}
              type="button"
              className="pill pill-neutral gap-1"
              onClick={() => onToggleYear(y)}
            >
              Năm {y}
              <X className="h-3 w-3" />
            </button>
          ))}
          {months.map((m) => (
            <button
              key={`m-${m}`}
              type="button"
              className="pill pill-neutral gap-1"
              onClick={() => onToggleMonth(m)}
            >
              T{m}
              <X className="h-3 w-3" />
            </button>
          ))}
          <button
            type="button"
            className="text-xs font-semibold text-primary hover:underline"
            onClick={onClear}
          >
            Xóa lọc
          </button>
        </div>
      ) : null}
    </div>
  );
}
