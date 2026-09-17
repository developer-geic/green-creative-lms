"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { lmsApi } from "@/lib/api";
import { buildQuery } from "@/lib/utils";

function StudentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [classId, setClassId] = useState(searchParams.get("class_id") || "");

  function load() {
    const query = buildQuery({ q, class_id: classId });
    router.replace(`/students${query}`);
    lmsApi.students(query).then((res) => setItems(res.data || [])).catch((e) => toast.error(e.message));
  }

  useEffect(() => {
    Promise.all([
      lmsApi.classes("?limit=100"),
      lmsApi.students(buildQuery({ q, class_id: classId })),
    ])
      .then(([classesRes, studentsRes]) => {
        setClasses(classesRes.data || []);
        setItems(studentsRes.data || []);
      })
      .catch((e) => toast.error(e.message));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-primary-dark">Học viên</h1>
      <div className="card flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Tìm tên..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input max-w-xs" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">Tất cả lớp</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.code}</option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={load}>Lọc</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-slate-500">
              <th className="py-2">Họ tên</th>
              <th>Lớp / trạng thái</th>
              <th>SĐT PH</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-b border-border/70">
                <td className="py-2 font-medium">{s.full_name}</td>
                <td className="text-xs text-slate-600">
                  {(s.enrollments || [])
                    .map((e: any) => `${e.class_code || e.class_id} (${e.status_name || e.status})`)
                    .join(", ") || "—"}
                </td>
                <td>{s.parent_phone || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <p className="py-6 text-center text-sm text-slate-500">Không có học viên.</p>}
      </div>
    </div>
  );
}

export default function StudentsPage() {
  return (
    <Suspense fallback={<div>Đang tải...</div>}>
      <StudentsContent />
    </Suspense>
  );
}
