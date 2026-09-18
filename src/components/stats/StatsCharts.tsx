"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StatsByTeacher, StatsSummary } from "@/types/lms";

const COLOR_ACTIVE = "#006948";
const COLOR_ENDED = "#92400e";
const COLOR_INACTIVE = "#565e74";
const COLOR_STUDENTS = "#85f8c4";
const COLOR_STUDENTS_TOTAL = "#006948";

const TOP_N = 8;

function useReducedMotionPreferred() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function shortenName(name: string, max = 14) {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
}

type StatsChartsProps = {
  summary: StatsSummary;
  byTeacher: StatsByTeacher[];
};

export function StatsCharts({ summary, byTeacher }: StatsChartsProps) {
  const animate = !useReducedMotionPreferred();

  const statusData = useMemo(() => {
    const rows = [
      { name: "Đang hoạt động", value: summary.active_classes, color: COLOR_ACTIVE },
      { name: "Đã kết thúc", value: summary.ended_classes, color: COLOR_ENDED },
      { name: "Ngừng hoạt động", value: summary.inactive_classes, color: COLOR_INACTIVE },
    ];
    return rows.filter((r) => r.value > 0);
  }, [summary]);

  const classesByTeacher = useMemo(() => {
    const sorted = [...byTeacher].sort((a, b) => b.classes - a.classes);
    const top = sorted.slice(0, TOP_N);
    const rest = sorted.slice(TOP_N);
    const rows = top.map((r) => ({
      name: shortenName(r.teacher_name),
      fullName: r.teacher_name,
      classes: r.classes,
    }));
    if (rest.length) {
      rows.push({
        name: `Khác (${rest.length})`,
        fullName: `Các giáo viên còn lại (${rest.length})`,
        classes: rest.reduce((s, r) => s + r.classes, 0),
      });
    }
    return rows;
  }, [byTeacher]);

  const studentsByTeacher = useMemo(() => {
    const sorted = [...byTeacher].sort((a, b) => b.students - a.students);
    const top = sorted.slice(0, TOP_N);
    const rest = sorted.slice(TOP_N);
    const rows = top.map((r) => ({
      name: shortenName(r.teacher_name),
      fullName: r.teacher_name,
      students_active: r.students_active,
      students: r.students,
    }));
    if (rest.length) {
      rows.push({
        name: `Khác (${rest.length})`,
        fullName: `Các giáo viên còn lại (${rest.length})`,
        students_active: rest.reduce((s, r) => s + r.students_active, 0),
        students: rest.reduce((s, r) => s + r.students, 0),
      });
    }
    return rows;
  }, [byTeacher]);

  const hasAny =
    statusData.length > 0 || classesByTeacher.length > 0 || studentsByTeacher.length > 0;

  if (!hasAny) {
    return (
      <div className="card py-12 text-center text-sm text-on-surface-variant">
        Không có dữ liệu theo bộ lọc.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="card flex flex-col !p-4">
        <h3 className="mb-1 text-sm font-bold text-foreground">Phân bố trạng thái lớp</h3>
        <p className="mb-4 text-xs text-on-surface-variant">Theo tổng số lớp trong bộ lọc</p>
        {statusData.length === 0 ? (
          <p className="flex flex-1 items-center justify-center py-10 text-sm text-on-surface-variant">
            Chưa có lớp.
          </p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={2}
                  isAnimationActive={animate}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [value ?? 0, "Số lớp"]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #bccac0",
                    fontSize: 12,
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  formatter={(value) => (
                    <span className="text-xs text-on-surface-variant">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card flex flex-col !p-4">
        <h3 className="mb-1 text-sm font-bold text-foreground">Số lớp theo giáo viên</h3>
        <p className="mb-4 text-xs text-on-surface-variant">Top {TOP_N} giáo viên có nhiều lớp nhất</p>
        {classesByTeacher.length === 0 ? (
          <p className="flex flex-1 items-center justify-center py-10 text-sm text-on-surface-variant">
            Chưa có dữ liệu giáo viên.
          </p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={classesByTeacher}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#dce9ff" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={96}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  labelFormatter={(_, payload) =>
                    (payload?.[0]?.payload as { fullName?: string } | undefined)?.fullName || ""
                  }
                  formatter={(value) => [value ?? 0, "Số lớp"]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #bccac0",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="classes"
                  fill={COLOR_ACTIVE}
                  radius={[0, 6, 6, 0]}
                  isAnimationActive={animate}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card flex flex-col !p-4 xl:col-span-2">
        <h3 className="mb-1 text-sm font-bold text-foreground">Học viên theo giáo viên</h3>
        <p className="mb-4 text-xs text-on-surface-variant">
          Đang học so với tổng enrollment (top {TOP_N})
        </p>
        {studentsByTeacher.length === 0 ? (
          <p className="py-10 text-center text-sm text-on-surface-variant">
            Chưa có dữ liệu học viên.
          </p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={studentsByTeacher}
                margin={{ top: 8, right: 16, left: 0, bottom: 48 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dce9ff" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={56}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  labelFormatter={(_, payload) =>
                    (payload?.[0]?.payload as { fullName?: string } | undefined)?.fullName || ""
                  }
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #bccac0",
                    fontSize: 12,
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-xs text-on-surface-variant">{value}</span>
                  )}
                />
                <Bar
                  dataKey="students_active"
                  name="Đang học"
                  fill={COLOR_STUDENTS}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={animate}
                />
                <Bar
                  dataKey="students"
                  name="Tổng enroll"
                  fill={COLOR_STUDENTS_TOTAL}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={animate}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
