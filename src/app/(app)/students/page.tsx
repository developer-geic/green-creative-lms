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
  const [status, setStatus] = useState(searchParams.get("status") || "");

  function load() {
    const query = buildQuery({ q, class_id: classId, status });
    router.replace(`/students${query}`);
    lmsApi.students(query).then((res) => setItems(res.data || [])).catch((e) => toast.error(e.message));
  }

  useEffect(() => {
    lmsApi.classes("?limit=100").then((res) => setClasses(res.data || [])).catch(() => {});
    load();
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
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang học</option>
          <option value="reserved">Bảo lưu</option>
          <option value="dropped">Nghỉ học</option>
        </select>
        <button className="btn btn-primary" onClick={load}>Lọc</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-slate-500">
              <th className="py-2">Họ tên</th>
              <th>Lớp</th>
              <th>SĐT PH</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-b border-border/70">
                <td className="py-2 font-medium">{s.full_name}</td>
                <td>{s.class_model?.code || s.class_id}</td>
                <td>{s.parent_phone || "—"}</td>
                <td><span className="pill pill-neutral">{s.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
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
