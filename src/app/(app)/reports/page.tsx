"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { lmsApi } from "@/lib/api";
import { buildQuery } from "@/lib/utils";

export default function ReportsPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      lmsApi
        .students(buildQuery({ q, limit: 10 }))
        .then((res) => setResults(res.data || []))
        .catch((e) => toast.error(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function openStudent(id: number) {
    try {
      const res = await lmsApi.studentDetail(id);
      setDetail(res.data);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-primary-dark">Tra cứu học viên</h1>
      <div className="card">
        <input className="input" placeholder="Gõ tên học viên..." value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="mt-2 space-y-1">
          {results.map((s) => (
            <button
              key={s.id}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-primary-soft"
              onClick={() => openStudent(s.id)}
            >
              <span className="font-medium">{s.full_name}</span>
              <span className="text-xs text-slate-500">{s.class_model?.code || s.class_id}</span>
            </button>
          ))}
        </div>
      </div>

      {detail && (
        <div className="card space-y-3">
          <div>
            <h2 className="text-xl font-semibold">{detail.full_name}</h2>
            <p className="text-sm text-slate-500">
              {detail.class_model?.code} · {detail.parent_phone || "—"} · {detail.status}
            </p>
          </div>
          <div>
            <h3 className="font-medium">Điểm danh gần đây</h3>
            <ul className="mt-1 space-y-1 text-sm">
              {(detail.attendance_records || []).slice(0, 10).map((r: any) => (
                <li key={r.id}>{r.session?.session_date || r.session_id}: {r.status}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-medium">Đánh giá</h3>
            <ul className="mt-1 space-y-1 text-sm">
              {(detail.assessments || []).map((a: any) => (
                <li key={a.id}>{a.month}/{a.year} {a.period}: L{a.listening} S{a.speaking} R{a.reading} W{a.writing}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
