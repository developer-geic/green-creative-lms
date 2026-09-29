"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProgressAssessTabs } from "@/components/ProgressAssessTabs";
import { SelectField } from "@/components/SelectField";
import { lmsApi } from "@/lib/api";
import { buildQuery } from "@/lib/utils";
import type {
  AssessmentIndexData,
  AssessmentPeriod,
  LmsAssessmentRecord,
} from "@/types/lms";

const PERIOD_LABELS: Record<AssessmentPeriod, string> = {
  mid: "Giữa kỳ",
  final: "Cuối kỳ",
};

const SKILL_FIELDS = [
  { key: "listening", label: "Listening" },
  { key: "speaking", label: "Speaking" },
  { key: "reading", label: "Reading" },
  { key: "writing", label: "Writing" },
] as const;

type SkillKey = (typeof SKILL_FIELDS)[number]["key"];

type FormState = {
  period: AssessmentPeriod;
  listening: string;
  speaking: string;
  reading: string;
  writing: string;
  general_comment: string;
  teacher_suggestion: string;
};

const emptyForm = (period: AssessmentPeriod = "mid"): FormState => ({
  period,
  listening: "",
  speaking: "",
  reading: "",
  writing: "",
  general_comment: "",
  teacher_suggestion: "",
});

function numOrNull(v: string): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function skillValue(rec: LmsAssessmentRecord | null | undefined, key: SkillKey): number | null {
  if (!rec) return null;
  const raw = rec[key];
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function averageSkills(rec: LmsAssessmentRecord | null | undefined): number | null {
  if (!rec) return null;
  const vals = SKILL_FIELDS.map((f) => skillValue(rec, f.key)).filter(
    (v): v is number => v != null,
  );
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

function formAverage(form: FormState): number | null {
  const vals = SKILL_FIELDS.map((f) => numOrNull(form[f.key])).filter(
    (v): v is number => v != null,
  );
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

function teacherNames(data: AssessmentIndexData | null): string {
  const list = data?.class?.teachers || [];
  const names = list
    .filter((t) => t.role === "teacher" || !t.role)
    .map((t) => t.name)
    .filter(Boolean);
  if (names.length) return names.join(", ");
  const any = list.map((t) => t.name).filter(Boolean);
  return any.length ? any.join(", ") : "—";
}

function AssessmentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = new Date();

  const [classes, setClasses] = useState<Array<{ id: number; code: string }>>([]);
  const [students, setStudents] = useState<
    Array<{ id: number; full_name: string; english_name?: string | null }>
  >([]);
  const [classId, setClassId] = useState(searchParams.get("class_id") || "");
  const [studentId, setStudentId] = useState(searchParams.get("student_id") || "");
  const [year, setYear] = useState(Number(searchParams.get("year") || now.getFullYear()));
  const [month, setMonth] = useState(Number(searchParams.get("month") || now.getMonth() + 1));
  const [data, setData] = useState<AssessmentIndexData | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LmsAssessmentRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    lmsApi.classes("?limit=100").then((res) => {
      const list = res.data || [];
      setClasses(list);
      if (!classId && list[0]) setClassId(String(list[0].id));
    });
  }, []);

  useEffect(() => {
    if (!classId) {
      setStudents([]);
      setStudentId("");
      return;
    }
    lmsApi.students(buildQuery({ class_id: classId, limit: 100 })).then((res) => {
      const list = res.data || [];
      setStudents(list);
      if (!list.some((s: { id: number }) => String(s.id) === studentId)) {
        setStudentId(list[0] ? String(list[0].id) : "");
      }
    });
  }, [classId]);

  function load() {
    if (!classId || !studentId) return;
    const query = buildQuery({
      class_id: classId,
      student_id: studentId,
      year,
      month,
    });
    router.replace(`/assessments${query}`);
    setLoading(true);
    lmsApi
      .assessments(query)
      .then((res) => setData(res.data as AssessmentIndexData))
      .catch((e) => toast.error(e.message || "Không tải được đánh giá"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (classId && studentId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, studentId, year, month]);

  function openModal(period: AssessmentPeriod) {
    const existing = period === "mid" ? data?.mid : data?.final;
    setForm({
      period,
      listening: existing?.listening != null ? String(existing.listening) : "",
      speaking: existing?.speaking != null ? String(existing.speaking) : "",
      reading: existing?.reading != null ? String(existing.reading) : "",
      writing: existing?.writing != null ? String(existing.writing) : "",
      general_comment: existing?.general_comment || "",
      teacher_suggestion: existing?.teacher_suggestion || "",
    });
    setModalOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      await lmsApi.saveAssessment({
        class_id: Number(classId),
        student_id: Number(studentId),
        year,
        month,
        period: form.period,
        listening: numOrNull(form.listening),
        speaking: numOrNull(form.speaking),
        reading: numOrNull(form.reading),
        writing: numOrNull(form.writing),
        general_comment: form.general_comment.trim() || null,
        teacher_suggestion: form.teacher_suggestion.trim() || null,
      });
      toast.success("Đã lưu đánh giá");
      setModalOpen(false);
      load();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e.message || "Lỗi lưu đánh giá");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await lmsApi.deleteAssessment(deleteTarget.id);
      toast.success("Đã xoá đánh giá");
      setDeleteTarget(null);
      load();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e.message || "Lỗi xoá đánh giá");
    } finally {
      setDeleting(false);
    }
  }

  const locked = Boolean(data?.class?.is_locked);
  const avgForm = formAverage(form);

  const radarData = useMemo(() => {
    return SKILL_FIELDS.map((f) => ({
      skill: f.label,
      mid: skillValue(data?.mid, f.key) ?? 0,
      final: skillValue(data?.final, f.key) ?? 0,
    }));
  }, [data]);

  const hasRadar = Boolean(data?.mid || data?.final);

  const yearOptions = [year - 1, year, year + 1].filter(
    (v, i, arr) => arr.indexOf(v) === i,
  );

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">Tiến độ &amp; Đánh giá</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Nhập đánh giá định kỳ giữa kỳ / cuối kỳ theo tháng.
          </p>
        </div>
        <ProgressAssessTabs />
      </div>

      <div className="card flex flex-wrap gap-3">
        <SelectField
          aria-label="Chọn lớp"
          className="min-w-[12rem]"
          value={classId}
          options={[
            { value: "", label: "— Chọn lớp —" },
            ...classes.map((c) => ({ value: String(c.id), label: c.code })),
          ]}
          onChange={setClassId}
        />
        <SelectField
          aria-label="Chọn học viên"
          className="min-w-[14rem]"
          value={studentId}
          options={[
            { value: "", label: "— Chọn học viên —" },
            ...students.map((s) => ({
              value: String(s.id),
              label: s.english_name
                ? `${s.full_name} (${s.english_name})`
                : s.full_name,
            })),
          ]}
          onChange={setStudentId}
        />
        <SelectField
          aria-label="Năm"
          className="min-w-[7rem]"
          value={String(year)}
          options={yearOptions.map((y) => ({ value: String(y), label: String(y) }))}
          onChange={(v) => setYear(Number(v))}
        />
        <SelectField
          aria-label="Tháng"
          className="min-w-[8rem]"
          value={String(month)}
          options={Array.from({ length: 12 }, (_, i) => i + 1).map((m) => ({
            value: String(m),
            label: `Tháng ${m}`,
          }))}
          onChange={(v) => setMonth(Number(v))}
        />
      </div>

      {!classId || !studentId ? (
        <div className="card text-sm text-on-surface-variant">
          Chọn lớp và học viên để xem hoặc nhập đánh giá.
        </div>
      ) : loading && !data ? (
        <div className="card text-sm text-on-surface-variant">Đang tải...</div>
      ) : data ? (
        <>
          <div className="grid gap-3 rounded-xl border border-primary/10 bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
            <InfoCell label="Họ và tên" value={data.student.full_name} />
            <InfoCell label="English Name" value={data.student.english_name || "—"} />
            <InfoCell
              label="Lớp"
              value={`${data.class.code}${data.class.course ? ` — ${data.class.course}` : ""}`}
            />
            <InfoCell label="Tháng đánh giá" value={`Tháng ${month}/${year}`} />
            <InfoCell label="Giáo viên phụ trách" value={teacherNames(data)} />
          </div>

          {locked ? (
            <div className="rounded-lg bg-[#fffbeb] px-3 py-2 text-sm text-[#92400e]">
              Lớp đã khóa — chỉ xem, không thể thêm/sửa/xoá đánh giá.
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {(["mid", "final"] as const).map((period) => (
              <PeriodCard
                key={period}
                period={period}
                record={period === "mid" ? data.mid : data.final}
                locked={locked}
                attendanceLabel={data.attendance_summary?.label}
                homeworkLabel={data.homework_summary?.label}
                attendanceRate={data.attendance_summary?.rate}
                homeworkRate={data.homework_summary?.rate}
                onAdd={() => openModal(period)}
                onEdit={() => openModal(period)}
                onDelete={() =>
                  setDeleteTarget(period === "mid" ? data.mid : data.final)
                }
              />
            ))}
          </div>

          {hasRadar ? (
            <div className="card">
              <h2 className="mb-4 text-base font-semibold text-foreground">
                Biểu đồ 4 kỹ năng
              </h2>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#E6EAE8" />
                    <PolarAngleAxis dataKey="skill" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    {data.mid ? (
                      <Radar
                        name="Giữa kỳ"
                        dataKey="mid"
                        stroke="#3E6690"
                        fill="#3E6690"
                        fillOpacity={0.18}
                      />
                    ) : null}
                    {data.final ? (
                      <Radar
                        name="Cuối kỳ"
                        dataKey="final"
                        stroke="#DDA23A"
                        fill="#DDA23A"
                        fillOpacity={0.2}
                      />
                    ) : null}
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}

          <div className="card">
            <h2 className="mb-4 text-base font-semibold text-foreground">
              Lịch sử đánh giá
            </h2>
            {(data.history || []).length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                Chưa có đánh giá nào ở các tháng khác cho học viên này.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.history.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-lg border border-surface-low bg-surface-low/40 px-4 py-3"
                  >
                    <div className="text-sm font-semibold text-foreground">
                      Tháng {a.month}/{a.year} – {PERIOD_LABELS[a.period] || a.period}
                    </div>
                    <div className="mt-1 text-xs text-on-surface-variant">
                      L:{a.listening ?? "—"} · S:{a.speaking ?? "—"} · R:
                      {a.reading ?? "—"} · W:{a.writing ?? "—"}
                      {averageSkills(a) != null ? ` · Tổng: ${averageSkills(a)}` : ""}
                    </div>
                    {a.general_comment ? (
                      <p className="mt-2 text-sm text-foreground/90">{a.general_comment}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface shadow-xl"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-surface-low bg-surface px-5 py-4">
              <h2 className="text-lg font-semibold text-foreground">
                {PERIOD_LABELS[form.period]} — Tháng {month}/{year}
              </h2>
              <button
                type="button"
                className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-low"
                onClick={() => setModalOpen(false)}
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                  Mức độ chuyên cần
                </h3>
                <p className="mb-3 text-xs text-on-surface-variant">
                  Tự động lấy từ Điểm danh &amp; Tiến độ BTVN trong tháng — không cần nhập lại.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <SummaryBox
                    label="Chuyên cần trên lớp"
                    value={data?.attendance_summary?.label || "—"}
                    hint={
                      data?.attendance_summary?.rate != null
                        ? `${data.attendance_summary.rate}% có mặt (${data.attendance_summary.present}/${data.attendance_summary.marked})`
                        : "Chưa có dữ liệu điểm danh"
                    }
                  />
                  <SummaryBox
                    label="Hoàn thành BTVN"
                    value={data?.homework_summary?.label || "—"}
                    hint={
                      data?.homework_summary?.rate != null
                        ? `${data.homework_summary.rate}% (${data.homework_summary.done}/${data.homework_summary.total})`
                        : "Chưa có dữ liệu BTVN"
                    }
                  />
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                  Năng lực ngoại ngữ (thang điểm 100)
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {SKILL_FIELDS.map((f) => (
                    <label key={f.key} className="block text-sm">
                      <span className="mb-1 block text-on-surface-variant">{f.label}</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="any"
                        className="input w-full"
                        value={form[f.key]}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                        }
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-3 rounded-lg bg-primary/5 px-3 py-2 text-sm">
                  Điểm tổng (trung bình 4 kỹ năng):{" "}
                  <span className="font-semibold text-primary-dark">
                    {avgForm != null ? avgForm : "—"}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                  Đánh giá của giáo viên
                </h3>
                <label className="mb-3 block text-sm">
                  <span className="mb-1 block text-on-surface-variant">Đánh giá chung</span>
                  <textarea
                    className="input min-h-[88px] w-full"
                    placeholder="Tình hình học tập, thái độ, điểm mạnh và cần cải thiện…"
                    value={form.general_comment}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, general_comment: e.target.value }))
                    }
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-on-surface-variant">
                    Đề xuất của giáo viên
                  </span>
                  <textarea
                    className="input min-h-[88px] w-full"
                    placeholder="Hướng cải thiện cho tháng tiếp theo…"
                    value={form.teacher_suggestion}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        teacher_suggestion: e.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-surface-low bg-surface px-5 py-4">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={save}
                disabled={saving}
              >
                {saving ? "Đang lưu…" : "Lưu đánh giá"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xoá bản đánh giá?"
        description="Thao tác này không thể hoàn tác."
        confirmLabel="Xoá"
        variant="danger"
        pending={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-on-surface-variant">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function SummaryBox({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-surface-low bg-surface-low/50 px-4 py-3">
      <div className="text-[11px] uppercase text-on-surface-variant">{label}</div>
      <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
      <div className="mt-0.5 text-xs text-on-surface-variant">{hint}</div>
    </div>
  );
}

function PeriodCard({
  period,
  record,
  locked,
  attendanceLabel,
  homeworkLabel,
  attendanceRate,
  homeworkRate,
  onAdd,
  onEdit,
  onDelete,
}: {
  period: AssessmentPeriod;
  record: LmsAssessmentRecord | null | undefined;
  locked: boolean;
  attendanceLabel?: string | null;
  homeworkLabel?: string | null;
  attendanceRate?: number | null;
  homeworkRate?: number | null;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const title = PERIOD_LABELS[period];
  const total = averageSkills(record);

  if (!record) {
    return (
      <div className="card">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{title}</h2>
          {!locked ? (
            <button type="button" className="btn btn-sm btn-primary" onClick={onAdd}>
              <Plus className="h-4 w-4" />
              Thêm đánh giá
            </button>
          ) : null}
        </div>
        <p className="text-sm text-on-surface-variant">
          Chưa có dữ liệu đánh giá {title.toLowerCase()} cho tháng này.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{title}</h2>
        {!locked ? (
          <div className="flex gap-1">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              aria-label="Sửa"
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm text-danger"
              aria-label="Xoá"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-surface-low px-3 py-2 text-center">
          <div className="text-sm font-semibold">{attendanceLabel || "—"}</div>
          <div className="text-[11px] text-on-surface-variant">
            Chuyên cần
            {attendanceRate != null ? ` (${attendanceRate}%)` : ""}
          </div>
        </div>
        <div className="rounded-lg bg-surface-low px-3 py-2 text-center">
          <div className="text-sm font-semibold">{homeworkLabel || "—"}</div>
          <div className="text-[11px] text-on-surface-variant">
            BTVN
            {homeworkRate != null ? ` (${homeworkRate}%)` : ""}
          </div>
        </div>
      </div>

      <div className="mb-3 text-sm text-on-surface-variant">
        L: <b className="text-foreground">{record.listening ?? "—"}</b>
        {" · "}
        S: <b className="text-foreground">{record.speaking ?? "—"}</b>
        {" · "}
        R: <b className="text-foreground">{record.reading ?? "—"}</b>
        {" · "}
        W: <b className="text-foreground">{record.writing ?? "—"}</b>
        {total != null ? (
          <>
            {" · "}
            Tổng: <b className="text-primary-dark">{total}</b>
          </>
        ) : null}
      </div>

      {record.general_comment ? (
        <p className="mb-2 text-sm">
          <b>Đánh giá chung:</b> {record.general_comment}
        </p>
      ) : null}
      {record.teacher_suggestion ? (
        <p className="text-sm">
          <b>Đề xuất của GV:</b> {record.teacher_suggestion}
        </p>
      ) : null}
    </div>
  );
}

export default function AssessmentsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-on-surface-variant">Đang tải...</div>}>
      <AssessmentsContent />
    </Suspense>
  );
}
