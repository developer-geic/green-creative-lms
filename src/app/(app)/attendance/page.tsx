"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { lmsApi } from "@/lib/api";
import { buildQuery } from "@/lib/utils";

const ATT_OPTIONS = [
  { value: "", label: "—" },
  { value: "present", label: "Có mặt" },
  { value: "excused", label: "Có phép" },
  { value: "unexcused", label: "Không phép" },
];

function AttendanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = new Date();
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState(searchParams.get("class_id") || "");
  const [year, setYear] = useState(Number(searchParams.get("year") || now.getFullYear()));
  const [month, setMonth] = useState(Number(searchParams.get("month") || now.getMonth() + 1));
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    lmsApi.classes("?limit=100").then((res) => {
      const list = res.data || [];
      setClasses(list);
      if (!classId && list[0]) setClassId(String(list[0].id));
    });
  }, []);

  function load(cid = classId) {
    if (!cid) return;
    const query = buildQuery({ year, month, class_id: cid });
    router.replace(`/attendance${query}`);
    lmsApi
      .attendance(cid, buildQuery({ year, month }))
      .then((res) => setData(res.data))
      .catch((e) => toast.error(e.message));
  }

  useEffect(() => {
    if (classId) load(classId);
  }, [classId]);

  const sessionByDate = useMemo(() => {
    const map: Record<string, number> = {};
    (data?.sessions || []).forEach((s: any) => {
      map[s.session_date?.slice?.(0, 10) || s.session_date] = s.id;
    });
    return map;
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
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-primary-dark">Điểm danh</h1>
      <div className="card flex flex-wrap gap-3">
        <select className="input max-w-xs" value={classId} onChange={(e) => setClassId(e.target.value)}>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.code}</option>
          ))}
        </select>
        <select className="input max-w-[120px]" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select className="input max-w-[120px]" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>Tháng {m}</option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={() => load()}>Xem</button>
      </div>

      {data?.class?.is_locked && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Lớp đã khóa — chỉ xem, không ghi điểm danh mới.
        </div>
      )}

      {data && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-slate-500">
                <th className="py-2">Học viên</th>
                {(data.dates || []).map((d: string) => (
                  <th key={d} className="px-1">{d.slice(5)}</th>
                ))}
                <th>Tỷ lệ</th>
              </tr>
            </thead>
            <tbody>
              {(data.grid || []).map((row: any) => (
                <tr key={row.student.id} className="border-b border-border/70">
                  <td className="py-2 font-medium">{row.student.full_name}</td>
                  {(data.dates || []).map((d: string) => (
                    <td key={d} className="px-1">
                      <select
                        className="input !min-w-[110px] !px-1 !py-1 text-xs"
                        disabled={data.class.is_locked}
                        value={row.cells?.[d]?.status || ""}
                        onChange={(e) => onChange(row.student.id, d, e.target.value)}
                      >
                        {ATT_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                  ))}
                  <td>{row.stats?.rate == null ? "—" : `${row.stats.rate}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={<div>Đang tải...</div>}>
      <AttendanceContent />
    </Suspense>
  );
}
