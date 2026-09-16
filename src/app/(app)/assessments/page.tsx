"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { lmsApi } from "@/lib/api";
import { buildQuery } from "@/lib/utils";

function AssessmentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = new Date();
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classId, setClassId] = useState(searchParams.get("class_id") || "");
  const [studentId, setStudentId] = useState(searchParams.get("student_id") || "");
  const [year, setYear] = useState(Number(searchParams.get("year") || now.getFullYear()));
  const [month, setMonth] = useState(Number(searchParams.get("month") || now.getMonth() + 1));
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState<any>({ period: "mid" });

  useEffect(() => {
    lmsApi.classes("?limit=100").then((res) => {
      const list = res.data || [];
      setClasses(list);
      if (!classId && list[0]) setClassId(String(list[0].id));
    });
  }, []);

  useEffect(() => {
    if (!classId) return;
    lmsApi.students(buildQuery({ class_id: classId, limit: 100 })).then((res) => {
      const list = res.data || [];
      setStudents(list);
      if (!studentId && list[0]) setStudentId(String(list[0].id));
    });
  }, [classId]);

  function load() {
    if (!classId || !studentId) return;
    const query = buildQuery({ class_id: classId, student_id: studentId, year, month });
    router.replace(`/assessments${query}`);
    lmsApi.assessments(query).then((res) => setData(res.data)).catch((e) => toast.error(e.message));
  }

  useEffect(() => {
    if (classId && studentId) load();
  }, [classId, studentId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await lmsApi.saveAssessment({
        class_id: Number(classId),
        student_id: Number(studentId),
        year,
        month,
        ...form,
      });
      toast.success("Đã lưu đánh giá");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-primary-dark">Nhận xét & đánh giá</h1>
      <div className="card flex flex-wrap gap-3">
        <select className="input max-w-xs" value={classId} onChange={(e) => setClassId(e.target.value)}>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
        </select>
        <select className="input max-w-xs" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
        <select className="input max-w-[120px]" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="input max-w-[120px]" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>Tháng {m}</option>)}
        </select>
        <button className="btn btn-primary" onClick={load}>Xem</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {(["mid", "final"] as const).map((period) => {
          const rec = data?.[period];
          return (
            <div key={period} className="card">
              <h2 className="mb-2 font-semibold">{period === "mid" ? "Giữa kỳ" : "Cuối kỳ"}</h2>
              {rec ? (
                <div className="space-y-1 text-sm">
                  <div>Trên lớp: {rec.in_class ?? "—"} · BTVN: {rec.homework ?? "—"}</div>
                  <div>L:{rec.listening ?? "—"} S:{rec.speaking ?? "—"} R:{rec.reading ?? "—"} W:{rec.writing ?? "—"}</div>
                  <p>{rec.general_comment}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Chưa có dữ liệu.</p>
              )}
            </div>
          );
        })}
      </div>

      {!data?.class?.is_locked && (
        <form onSubmit={save} className="card grid gap-3 md:grid-cols-2">
          <h2 className="md:col-span-2 font-semibold">Thêm / sửa đánh giá</h2>
          <select className="input" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>
            <option value="mid">Giữa kỳ</option>
            <option value="final">Cuối kỳ</option>
          </select>
          {["in_class", "homework", "listening", "speaking", "reading", "writing"].map((f) => (
            <input key={f} className="input" type="number" step="any" placeholder={f} value={form[f] ?? ""} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
          ))}
          <textarea className="input md:col-span-2" placeholder="Đánh giá chung" value={form.general_comment || ""} onChange={(e) => setForm({ ...form, general_comment: e.target.value })} />
          <button className="btn btn-primary md:col-span-2">Lưu đánh giá</button>
        </form>
      )}
    </div>
  );
}

export default function AssessmentsPage() {
  return <Suspense fallback={<div>Đang tải...</div>}><AssessmentsContent /></Suspense>;
}
