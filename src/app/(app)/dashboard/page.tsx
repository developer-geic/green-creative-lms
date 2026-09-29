"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  CalendarDays,
  CheckCircle2,
  DoorOpen,
  Plus,
  School,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { lmsApi } from "@/lib/api";

type DashboardData = {
  metrics: {
    active_classes: number;
    total_classes: number;
    total_students: number;
    students_by_status: { active: number; reserved: number; dropped: number };
    classes_today: number;
    attendance_rate_month: number | null;
    attendance_marked_month: number;
  };
  classes_today: Array<{
    id: number;
    code: string;
    course?: string | null;
    time?: string | null;
    room?: string | null;
    schedule?: string | null;
  }>;
  at_risk: Array<{
    student_id: number;
    name: string;
    class_code: string;
    unexcused_count: number;
  }>;
  attention_classes?: Array<{
    id: number;
    code: string;
    course?: string | null;
    note?: string | null;
  }>;
};

function todayLabel() {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const name =
    (session?.user as { name?: string } | undefined)?.name?.split(" ").slice(-2).join(" ") ||
    "Giáo viên";

  useEffect(() => {
    lmsApi
      .dashboard()
      .then((res) => setData(res.data))
      .catch((e) => toast.error(e.message));
  }, []);

  if (!data) {
    return <div className="text-sm text-on-surface-variant">Đang tải tổng quan...</div>;
  }

  const m = data.metrics;
  const avgPerClass =
    m.active_classes > 0 ? Math.round(m.total_students / m.active_classes) : 0;

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="relative overflow-hidden rounded-xl bg-surface p-6 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-gradient-to-br from-primary/10 via-primary-soft/20 to-transparent blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              <CalendarDays className="h-3.5 w-3.5 text-primary" />
              <span>{todayLabel()}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Xin chào, {name}!
            </h1>
            <p className="text-sm text-on-surface-variant">
              Chúc một ngày giảng dạy tràn đầy cảm hứng và hiệu quả tại Sáng Tạo Xanh.
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
            <Link href="/attendance" className="btn btn-ghost w-full sm:w-auto">
              <CheckCircle2 className="h-4 w-4" />
              Điểm danh nhanh
            </Link>
            <Link href="/classes" className="btn btn-primary w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Thêm lớp mới
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">Lớp đang hoạt động</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-low text-primary">
              <DoorOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-4xl font-bold leading-none text-foreground">{m.active_classes}</span>
            <span className="pill pill-good">/ {m.total_classes} lớp</span>
          </div>
          <div className="mt-4 flex items-center justify-between pt-1 text-xs text-on-surface-variant">
            <span>Đang vận hành</span>
            <Link href="/classes" className="font-semibold text-primary hover:underline">
              Chi tiết →
            </Link>
          </div>
        </div>

        <div className="card flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">Học viên phụ trách</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-low text-secondary">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-4xl font-bold leading-none text-foreground">{m.total_students}</span>
            <span className="pill pill-neutral">{avgPerClass} HV / lớp</span>
          </div>
          <div className="mt-4 flex items-center gap-1 pt-1 text-xs text-on-surface-variant">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span>
              {m.students_by_status.active} đang học · {m.students_by_status.reserved} bảo lưu ·{" "}
              {m.students_by_status.dropped} nghỉ
            </span>
          </div>
        </div>

        <div className="card flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">Buổi học hôm nay</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-highest text-primary">
              <School className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-4xl font-bold leading-none text-foreground">{m.classes_today}</span>
            <span className="pill pill-good">Ca hôm nay</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 pt-1 text-xs text-on-surface-variant">
            {(data.classes_today || []).slice(0, 3).map((c) => (
              <span key={c.id} className="font-medium text-foreground">
                {c.time || c.code}
              </span>
            ))}
            {!data.classes_today?.length ? <span>Không có buổi</span> : null}
          </div>
        </div>

        <div className="card flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">Tỷ lệ có mặt tháng này</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-low text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold leading-none text-foreground">
                {m.attendance_rate_month == null ? "—" : m.attendance_rate_month}
              </span>
              {m.attendance_rate_month != null ? (
                <span className="text-lg font-bold text-foreground">%</span>
              ) : null}
            </div>
            <span className="pill pill-good">Tháng này</span>
          </div>
          <div className="mt-4 flex items-center gap-2 pt-1">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-low">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary-soft"
                style={{ width: `${Math.min(m.attendance_rate_month ?? 0, 100)}%` }}
              />
            </div>
            <span className="text-[11px] text-on-surface-variant">
              {m.attendance_marked_month} lượt
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-8">
          <div className="flex flex-col overflow-hidden rounded-xl bg-surface shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-2">
                <div className="h-6 w-2.5 rounded-full bg-primary" />
                <div>
                  <h2 className="text-lg font-bold text-foreground">Lịch giảng dạy hôm nay</h2>
                  <p className="text-xs text-on-surface-variant">
                    {data.classes_today?.length || 0} lớp học chuẩn bị diễn ra hoặc cần hoàn tất điểm danh
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-surface-high px-3 py-1 text-[11px] font-semibold text-foreground">
                {new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "long" }).format(new Date())}
              </span>
            </div>
            <div className="flex flex-col gap-4 px-6 pb-6">
              {(data.classes_today || []).map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col justify-between gap-4 rounded-xl bg-surface-low p-4 transition-colors hover:bg-surface-high sm:flex-row sm:items-center"
                >
                  <div className="flex items-start gap-4 sm:items-center">
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-container text-on-primary">
                      <span className="text-[10px] font-bold uppercase">Ca</span>
                      <span className="text-sm font-bold leading-none">{c.time?.slice(0, 5) || "—"}</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-base font-bold text-foreground">{c.code}</span>
                        {c.course ? (
                          <span className="rounded-full bg-surface-highest px-2 py-0.5 text-[11px] text-foreground">
                            {c.course}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
                        <span>Phòng: {c.room || "—"}</span>
                        <span>{c.schedule || ""}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-center">
                    <Link href={`/classes/${c.id}`} className="btn btn-ghost !py-2">
                      Vào lớp
                    </Link>
                    <Link href={`/attendance?class_id=${c.id}`} className="btn btn-primary !py-2">
                      Điểm danh ngay
                    </Link>
                  </div>
                </div>
              ))}
              {!data.classes_today?.length ? (
                <p className="py-4 text-center text-sm text-on-surface-variant">
                  Không có lớp học hôm nay.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <div className="relative flex flex-col overflow-hidden rounded-xl bg-surface p-6 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
            <div className="absolute left-0 right-0 top-0 h-1 bg-danger" />
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-base font-bold text-danger">
                <span>Cảnh báo nghỉ không phép</span>
              </div>
              <span className="pill pill-danger">{data.at_risk?.length || 0} trường hợp</span>
            </div>
            <p className="mb-4 text-xs text-on-surface-variant">
              Học viên vắng không rõ lý do gần đây. Cần giáo viên liên hệ phụ huynh.
            </p>
            <div className="flex flex-col gap-2">
              {(data.at_risk || []).slice(0, 5).map((x, idx) => (
                <div
                  key={x.student_id}
                  className={`flex flex-col gap-1 rounded-lg p-2 ${
                    idx === 0 ? "bg-danger-container/20" : "bg-surface-low"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{x.name}</span>
                    <span className="pill pill-danger">Nghỉ {x.unexcused_count} buổi</span>
                  </div>
                  <div className="text-xs text-on-surface-variant">Lớp {x.class_code}</div>
                  <Link
                    href={`/students?q=${encodeURIComponent(x.name)}`}
                    className="mt-1 text-center text-[11px] font-semibold text-primary hover:underline"
                  >
                    Xem hồ sơ →
                  </Link>
                </div>
              ))}
              {!data.at_risk?.length ? (
                <p className="text-sm text-on-surface-variant">Chưa ghi nhận nghỉ không phép.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl bg-surface p-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 text-on-surface">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary-dark">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold">Thao tác nhanh:</span>
                <span className="ml-1 text-xs text-on-surface-variant">
                  Mở điểm danh hoặc quản lý lớp.
                </span>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Link href="/classes" className="btn btn-ghost flex-1">
                Lớp học
              </Link>
              <Link href="/attendance" className="btn btn-primary flex-1">
                Điểm danh
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
