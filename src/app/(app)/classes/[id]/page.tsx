"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { lmsApi } from "@/lib/api";

export default function ClassDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [studentName, setStudentName] = useState("");

  function load() {
    lmsApi
      .classDetail(id)
      .then((res) => setData(res.data))
      .catch((e) => toast.error(e.message));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function addStudent(e: React.FormEvent) {
    e.preventDefault();
    try {
      await lmsApi.createStudent({ class_id: Number(id), full_name: studentName });
      setStudentName("");
      toast.success("Đã thêm học viên");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (!data) return <div>Đang tải...</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-primary-dark">{data.code}</h1>
        <p className="text-sm text-slate-500">
          {data.course || "—"} · {data.schedule} · {data.time} · {data.room}
        </p>
        <div className="mt-2">
          <span
            className={`pill ${
              data.status === "active" ? "pill-good" : data.status === "ended" ? "pill-warn" : "pill-neutral"
            }`}
          >
            {data.status === "active"
              ? "Đang hoạt động"
              : data.status === "ended"
                ? "Đã kết thúc"
                : "Ngừng hoạt động"}
          </span>
        </div>
      </div>

      {data.is_locked && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Lớp đã khóa — không thể chỉnh sửa nội dung (học viên, điểm danh, tiến độ, đánh giá).
        </div>
      )}

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Học viên ({data.student_count})</h2>
        </div>
        {!data.is_locked && (
          <form onSubmit={addStudent} className="mb-4 flex gap-2">
            <input
              className="input"
              placeholder="Họ tên học viên"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              required
            />
            <button className="btn btn-primary">Thêm</button>
          </form>
        )}
        <div className="space-y-2">
          {(data.students || []).map((s: any) => (
            <div key={s.id} className="flex justify-between border-b border-border py-2 text-sm">
              <div>
                <div className="font-medium">{s.full_name}</div>
                <div className="text-xs text-slate-500">{s.parent_phone || "—"}</div>
              </div>
              <span className="pill pill-neutral">{s.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
