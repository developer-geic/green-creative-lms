"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { lmsApi } from "@/lib/api";
import { buildQuery } from "@/lib/utils";

function StatsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [teacherIds, setTeacherIds] = useState<string[]>(searchParams.getAll("teacher_ids[]"));
  const [years, setYears] = useState<string[]>(searchParams.getAll("years[]"));
  const [months, setMonths] = useState<string[]>(searchParams.getAll("months[]"));
  const [data, setData] = useState<any>(null);
  const yearNow = new Date().getFullYear();

  useEffect(() => {
    lmsApi.users("?limit=100").then((res) => {
      setTeachers((res.data || []).filter((u: any) => u.role === "teacher"));
    }).catch(() => {});
    load();
  }, []);

  function toggle(list: string[], value: string, setter: (v: string[]) => void) {
    setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  function load() {
    const query = buildQuery({
      teacher_ids: teacherIds,
      years,
      months,
    });
    router.replace(`/stats${query}`);
    lmsApi.stats(query).then((res) => setData(res.data)).catch((e) => toast.error(e.message));
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-primary-dark">Thống kê</h1>
      <div className="card space-y-3">
        <div>
          <div className="mb-1 text-xs text-slate-500">Giáo viên (đa chọn)</div>
          <div className="flex flex-wrap gap-2">
            {teachers.map((t) => (
              <label key={t.id} className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={teacherIds.includes(String(t.id))} onChange={() => toggle(teacherIds, String(t.id), setTeacherIds)} />
                {t.name || t.email}
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <div>
            <div className="mb-1 text-xs text-slate-500">Năm</div>
            <div className="flex gap-2">
              {[yearNow - 1, yearNow, yearNow + 1].map((y) => (
                <label key={y} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={years.includes(String(y))} onChange={() => toggle(years, String(y), setYears)} />
                  {y}
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs text-slate-500">Tháng</div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <label key={m} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={months.includes(String(m))} onChange={() => toggle(months, String(m), setMonths)} />
                  {m}
                </label>
              ))}
            </div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={load}>Áp dụng</button>
      </div>

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="card"><div className="text-xs text-slate-500">Tổng lớp</div><div className="text-3xl font-bold">{data.summary.total_classes}</div></div>
            <div className="card"><div className="text-xs text-slate-500">Đã kết thúc</div><div className="text-3xl font-bold">{data.summary.ended_classes}</div></div>
            <div className="card"><div className="text-xs text-slate-500">Học viên</div><div className="text-3xl font-bold">{data.summary.total_students}</div></div>
            {data.summary.has_time_filter && (
              <div className="card"><div className="text-xs text-slate-500">Buổi điểm danh</div><div className="text-3xl font-bold">{data.summary.attendance_sessions}</div></div>
            )}
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-slate-500">
                  <th className="py-2">Giáo viên</th>
                  <th>Số lớp</th>
                  <th>Đang hoạt động</th>
                  <th>Đã kết thúc</th>
                  <th>Học viên</th>
                </tr>
              </thead>
              <tbody>
                {(data.by_teacher || []).map((r: any) => (
                  <tr key={r.teacher_id ?? r.teacher_name} className="border-b border-border/70">
                    <td className="py-2 font-medium">{r.teacher_name}</td>
                    <td>{r.classes}</td>
                    <td>{r.active}</td>
                    <td>{r.ended}</td>
                    <td>{r.students_active}/{r.students}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default function StatsPage() {
  return <Suspense fallback={<div>Đang tải...</div>}><StatsContent /></Suspense>;
}
