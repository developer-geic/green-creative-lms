"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useCatalog } from "@/hooks/useCatalog";
import { lmsApi } from "@/lib/api";
import { buildQuery } from "@/lib/utils";

function ProgressContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = new Date();
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState(searchParams.get("class_id") || "");
  const [year, setYear] = useState(Number(searchParams.get("year") || now.getFullYear()));
  const [month, setMonth] = useState(Number(searchParams.get("month") || now.getMonth() + 1));
  const [data, setData] = useState<any>(null);
  const { items: absorptionLevels } = useCatalog("absorption-levels");

  useEffect(() => {
    lmsApi.classes("?limit=100").then((res) => {
      const list = res.data || [];
      setClasses(list);
      if (!classId && list[0]) setClassId(String(list[0].id));
    });
  }, []);

  function load(cid = classId) {
    if (!cid) return;
    router.replace(`/progress${buildQuery({ class_id: cid, year, month })}`);
    lmsApi
      .progress(cid, buildQuery({ year, month }))
      .then((res) => setData(res.data))
      .catch((e) => toast.error(e.message));
  }

  useEffect(() => {
    if (classId) load(classId);
  }, [classId]);

  const sessionByDate = useMemo(() => {
    const map: Record<string, number> = {};
    (data?.dates || []).forEach((d: string, i: number) => {
      // sessions are ensured; we store by fetching attendance sessions via progress grid dates
      map[d] = i; // placeholder; upsert needs session id from API - reload after save uses class progress
    });
    return map;
  }, [data]);

  async function saveCell(studentId: number, date: string, homework: string, absorption: string) {
    try {
      // Get session via attendance endpoint then upsert
      const att = await lmsApi.attendance(classId, buildQuery({ year, month }));
      const session = (att.data?.sessions || []).find(
        (s: any) => (s.session_date?.slice?.(0, 10) || s.session_date) === date,
      );
      if (!session) return toast.error("Không tìm thấy buổi học");
      await lmsApi.upsertProgress(session.id, [
        {
          student_id: studentId,
          homework: homework || null,
          absorption: absorption || null,
        },
      ]);
      toast.success("Đã lưu tiến độ");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-primary-dark">Tiến độ học tập</h1>
      <div className="card flex flex-wrap gap-3">
        <select
          className="input w-full sm:max-w-xs"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}
            </option>
          ))}
        </select>
        <select
          className="input w-full sm:max-w-[120px]"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {[year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          className="input w-full sm:max-w-[120px]"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              Tháng {m}
            </option>
          ))}
        </select>
        <button className="btn btn-primary w-full sm:w-auto" onClick={() => load()}>
          Xem
        </button>
      </div>

      {data && (
        <div className="card !p-0 overflow-hidden">
          <p className="px-4 pt-3 text-xs text-on-surface-variant md:hidden">
            Vuốt ngang để xem buổi
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border text-slate-500">
                  <th className="sticky left-0 z-10 bg-surface px-3 py-2 text-left">Học viên</th>
                  {(data.dates || []).map((d: string) => (
                    <th key={d}>{d.slice(5)}</th>
                  ))}
                  <th>BTVN</th>
                </tr>
              </thead>
              <tbody>
                {(data.grid || []).map((row: any) => (
                  <tr key={row.student.id} className="border-b border-border/70">
                    <td className="sticky left-0 z-10 bg-surface px-3 py-2 font-medium">
                      {row.student.full_name}
                    </td>
                    {(data.dates || []).map((d: string) => {
                      const cell = row.cells?.[d] || {};
                      return (
                        <td key={d} className="space-y-1 p-1">
                          <select
                            className="input !py-1 text-xs"
                            disabled={data.class.is_locked}
                            value={cell.homework || ""}
                            onChange={(e) =>
                              saveCell(row.student.id, d, e.target.value, cell.absorption || "")
                            }
                          >
                            <option value="">BTVN</option>
                            <option value="done">Hoàn thành</option>
                            <option value="missing">Chưa HT</option>
                          </select>
                          <select
                            className="input !py-1 text-xs"
                            disabled={data.class.is_locked}
                            value={cell.absorption || ""}
                            onChange={(e) =>
                              saveCell(row.student.id, d, cell.homework || "", e.target.value)
                            }
                          >
                            <option value="">Tiếp thu</option>
                            {absorptionLevels.map((level) => (
                              <option key={level.id} value={level.code}>
                                {level.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                    <td>{row.stats?.rate == null ? "—" : `${row.stats.rate}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* silence unused */}
      <span className="hidden">{Object.keys(sessionByDate).length}</span>
    </div>
  );
}

export default function ProgressPage() {
  return <Suspense fallback={<div>Đang tải...</div>}><ProgressContent /></Suspense>;
}
