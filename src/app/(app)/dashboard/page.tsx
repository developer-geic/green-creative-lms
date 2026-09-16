"use client";

import { useEffect, useState } from "react";
import { lmsApi } from "@/lib/api";
import { toast } from "sonner";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    lmsApi
      .dashboard()
      .then((res) => setData(res.data))
      .catch((e) => toast.error(e.message));
  }, []);

  if (!data) return <div className="text-sm text-slate-500">Đang tải...</div>;

  const m = data.metrics;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary-dark">Tổng quan</h1>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card">
          <div className="text-xs text-slate-500">Lớp đang hoạt động</div>
          <div className="mt-1 text-3xl font-bold">{m.active_classes}</div>
          <div className="text-xs text-slate-500">/ {m.total_classes} lớp</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">Học viên</div>
          <div className="mt-1 text-3xl font-bold">{m.total_students}</div>
          <div className="text-xs text-slate-500">
            {m.students_by_status.active} đang học · {m.students_by_status.reserved} bảo lưu ·{" "}
            {m.students_by_status.dropped} nghỉ
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">Buổi học hôm nay</div>
          <div className="mt-1 text-3xl font-bold">{m.classes_today}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">Tỷ lệ có mặt tháng này</div>
          <div className="mt-1 text-3xl font-bold">
            {m.attendance_rate_month == null ? "—" : `${m.attendance_rate_month}%`}
          </div>
          <div className="text-xs text-slate-500">{m.attendance_marked_month} lượt đã chấm</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">Lớp hôm nay</h2>
          <div className="space-y-2">
            {(data.classes_today || []).map((c: any) => (
              <div key={c.id} className="flex justify-between border-b border-border py-2 text-sm">
                <span className="font-medium">{c.code}</span>
                <span className="text-slate-500">
                  {c.time || "—"} · {c.room || "—"}
                </span>
              </div>
            ))}
            {!data.classes_today?.length && (
              <p className="text-sm text-slate-500">Không có lớp học hôm nay.</p>
            )}
          </div>
        </div>
        <div className="card">
          <h2 className="mb-3 font-semibold">Học viên nghỉ không phép</h2>
          <div className="space-y-2">
            {(data.at_risk || []).map((x: any) => (
              <div key={x.student_id} className="flex items-center justify-between border-b border-border py-2 text-sm">
                <div>
                  <div className="font-medium">{x.name}</div>
                  <div className="text-xs text-slate-500">{x.class_code}</div>
                </div>
                <span className="pill pill-danger">{x.unexcused_count} buổi</span>
              </div>
            ))}
            {!data.at_risk?.length && (
              <p className="text-sm text-slate-500">Chưa ghi nhận nghỉ không phép.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
