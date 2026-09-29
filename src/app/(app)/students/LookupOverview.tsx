"use client";

import { useMemo } from "react";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Pencil, UserRound } from "lucide-react";
import { SelectField } from "@/components/SelectField";
import { avatarSrc } from "@/lib/avatar";
import type {
  LmsClass,
  StudentAssessmentItem,
  StudentOverview,
} from "@/types/lms";

const ATT_PILL: Record<string, string> = {
  present: "bg-[#ecfdf5] text-[#065f46]",
  excused: "bg-[#eff6ff] text-[#1e40af]",
  unexcused: "bg-[#fef2f2] text-[#991b1b]",
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

type Props = {
  data: StudentOverview;
  classes: LmsClass[];
  filterClassId: string;
  filterYear: number;
  filterMonth: string;
  canEdit: boolean;
  onFilterClass: (v: string) => void;
  onFilterYear: (v: number) => void;
  onFilterMonth: (v: string) => void;
  onEdit: () => void;
};

export function LookupOverview({
  data,
  classes,
  filterClassId,
  filterYear,
  filterMonth,
  canEdit,
  onFilterClass,
  onFilterYear,
  onFilterMonth,
  onEdit,
}: Props) {
  const student = data.student;
  const stats = data.stats;
  const enrollments = student.enrollments || [];
  const thumb = avatarSrc(student.avatar);

  const classOptions = useMemo(() => {
    const fromEnroll = enrollments.map((e) => ({
      value: String(e.class_id),
      label: e.class_code || `Lớp #${e.class_id}`,
    }));
    if (fromEnroll.length) return fromEnroll;
    return classes.map((c) => ({ value: String(c.id), label: c.code }));
  }, [enrollments, classes]);

  const yearOptions = [filterYear - 1, filterYear, filterYear + 1].filter(
    (v, i, arr) => arr.indexOf(v) === i,
  );

  const radarData = useMemo(() => {
    const latest = data.assessments[0];
    const prior =
      data.assessments.find(
        (a) => a.id !== latest?.id && (a.year !== latest?.year || a.month !== latest?.month),
      ) ||
      data.assessments.find((a) => a.id !== latest?.id) ||
      null;
    if (!latest) return null;
    const keys = ["listening", "speaking", "reading", "writing"] as const;
    const labels = ["Listening", "Speaking", "Reading", "Writing"];
    return {
      chart: labels.map((label, i) => ({
        skill: label,
        latest: Number(latest[keys[i]] ?? 0),
        prior: prior ? Number(prior[keys[i]] ?? 0) : 0,
      })),
      latest,
      prior,
    };
  }, [data.assessments]);

  const statusLabel =
    enrollments
      .map((e) => e.status_name || e.status)
      .filter(Boolean)
      .join(", ") || "—";

  const classLabel =
    enrollments
      .map((e) => e.class_code || `#${e.class_id}`)
      .filter(Boolean)
      .join(", ") || "—";

  return (
    <div className="space-y-5">
      <div className="card flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-low">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="h-full w-full object-cover" />
          ) : (
            <UserRound className="h-8 w-8 text-on-surface-variant" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xl font-semibold text-foreground">
            {student.full_name}
            {student.english_name ? (
              <span className="ml-2 text-base font-normal text-on-surface-variant">
                ({student.english_name})
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-sm text-on-surface-variant">
            {classLabel}
            {student.parent_phone || student.phone
              ? ` · ${student.parent_phone || student.phone}`
              : ""}
          </div>
          <div className="mt-2 inline-flex rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary-dark">
            {statusLabel}
          </div>
        </div>
        {canEdit ? (
          <button type="button" className="btn btn-ghost" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Sửa hồ sơ
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatBox value={String(stats.marked)} label="Buổi đã điểm danh" />
        <StatBox
          value={stats.present_rate == null ? "—" : `${stats.present_rate}%`}
          label="Tỷ lệ có mặt"
        />
        <StatBox value={String(stats.unexcused)} label="Nghỉ không phép" />
        <StatBox
          value={stats.homework_rate == null ? "—" : `${stats.homework_rate}%`}
          label="Hoàn thành BTVN"
        />
      </div>

      <div className="card flex flex-wrap gap-3">
        <SelectField
          aria-label="Lọc lớp"
          className="min-w-[12rem]"
          value={filterClassId}
          options={[
            { value: "", label: "Tất cả lớp" },
            ...classOptions,
          ]}
          onChange={onFilterClass}
        />
        <SelectField
          aria-label="Năm"
          className="min-w-[7rem]"
          value={String(filterYear)}
          options={yearOptions.map((y) => ({ value: String(y), label: String(y) }))}
          onChange={(v) => onFilterYear(Number(v))}
        />
        <SelectField
          aria-label="Tháng"
          className="min-w-[9rem]"
          value={filterMonth}
          options={[
            { value: "", label: "Tất cả tháng" },
            ...Array.from({ length: 12 }, (_, i) => i + 1).map((m) => ({
              value: String(m),
              label: `Tháng ${m}`,
            })),
          ]}
          onChange={onFilterMonth}
        />
        <p className="w-full text-xs text-on-surface-variant">
          Bộ lọc áp dụng cho lịch sử điểm danh và tiến độ. Thống kê tổng quan theo lớp đang chọn
          (hoặc tất cả lớp).
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Lịch sử điểm danh</h2>
          <div className="card max-h-[420px] overflow-y-auto">
            {data.attendance_history.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Chưa có dữ liệu điểm danh.</p>
            ) : (
              <ul className="divide-y divide-surface-low">
                {data.attendance_history.map((row) => (
                  <li key={row.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {formatDate(row.date)}
                      </div>
                      <div className="text-xs text-on-surface-variant">
                        {row.class_code || "—"}
                      </div>
                      {row.note ? (
                        <div className="mt-1 text-xs text-on-surface-variant">{row.note}</div>
                      ) : null}
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${
                        ATT_PILL[row.status || ""] || "bg-surface-low text-on-surface-variant"
                      }`}
                    >
                      {row.status_label || row.status || "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <h2 className="text-base font-semibold text-foreground">Tiến độ học tập</h2>
          <div className="card max-h-[420px] overflow-y-auto">
            {data.progress_history.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Chưa có dữ liệu tiến độ.</p>
            ) : (
              <ul className="divide-y divide-surface-low">
                {data.progress_history.map((row) => (
                  <li key={row.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-medium text-foreground">
                        {formatDate(row.date)}
                        <span className="ml-2 text-xs font-normal text-on-surface-variant">
                          {row.class_code || ""}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {row.homework_label ? (
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                              row.homework === "done"
                                ? "bg-[#ecfdf5] text-[#065f46]"
                                : "bg-[#fef2f2] text-[#991b1b]"
                            }`}
                          >
                            {row.homework_label}
                          </span>
                        ) : null}
                        {row.absorption_label ? (
                          <span className="rounded-md bg-surface-low px-2 py-0.5 text-xs font-semibold text-on-surface-variant">
                            {row.absorption_label}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {row.note ? (
                      <p className="mt-1 text-xs text-on-surface-variant">{row.note}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Đánh giá 4 kỹ năng</h2>
          <div className="card">
            {radarData ? (
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData.chart}>
                    <PolarGrid stroke="#E6EAE8" />
                    <PolarAngleAxis dataKey="skill" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar
                      name={`${radarData.latest.period_label} T${radarData.latest.month}/${radarData.latest.year}`}
                      dataKey="latest"
                      stroke="#DDA23A"
                      fill="#DDA23A"
                      fillOpacity={0.2}
                    />
                    {radarData.prior ? (
                      <Radar
                        name={`${radarData.prior.period_label} T${radarData.prior.month}/${radarData.prior.year}`}
                        dataKey="prior"
                        stroke="#3E6690"
                        fill="#3E6690"
                        fillOpacity={0.15}
                      />
                    ) : null}
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant">Chưa có bản đánh giá nào.</p>
            )}
          </div>

          {data.assessments.length > 0 ? (
            <>
              <h2 className="text-base font-semibold text-foreground">Lịch sử đánh giá</h2>
              <div className="card max-h-[360px] space-y-3 overflow-y-auto">
                {data.assessments.map((a) => (
                  <AssessmentBlock key={a.id} item={a} />
                ))}
              </div>
            </>
          ) : null}

          <h2 className="text-base font-semibold text-foreground">Ghi chú</h2>
          <div className="card">
            <p className="text-sm text-foreground">
              {data.notes?.trim() || student.notes?.trim() || "Không có ghi chú."}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-primary/10 bg-surface px-4 py-3 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="text-2xl font-semibold tracking-tight text-foreground">{value}</div>
      <div className="mt-0.5 text-xs text-on-surface-variant">{label}</div>
    </div>
  );
}

function AssessmentBlock({ item }: { item: StudentAssessmentItem }) {
  return (
    <div className="border-b border-surface-low pb-3 last:border-b-0 last:pb-0">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-variant">
        <span className="font-semibold text-foreground">
          {item.period_label} — Tháng {item.month}/{item.year}
          {item.class_code ? ` · ${item.class_code}` : ""}
        </span>
        {item.total != null ? (
          <span>
            Tổng: <b className="text-primary-dark">{item.total}</b>/100
          </span>
        ) : null}
      </div>
      <div className="text-sm text-on-surface-variant">
        L:{item.listening ?? "—"} · S:{item.speaking ?? "—"} · R:{item.reading ?? "—"} · W:
        {item.writing ?? "—"}
      </div>
      {item.general_comment ? (
        <p className="mt-1.5 text-sm">
          <b>Đánh giá chung:</b> {item.general_comment}
        </p>
      ) : null}
      {item.teacher_suggestion ? (
        <p className="mt-1 text-sm">
          <b>Đề xuất GV:</b> {item.teacher_suggestion}
        </p>
      ) : null}
    </div>
  );
}
