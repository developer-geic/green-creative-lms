"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import {
  Download,
  Eye,
  Filter,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  UserCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useCatalog } from "@/hooks/useCatalog";
import { lmsApi } from "@/lib/api";
import { buildQuery, cn } from "@/lib/utils";
import type { LmsClass } from "@/types/lms";

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "pill-good",
    inactive: "pill-neutral",
    ended: "pill-warn",
  };
  const label: Record<string, string> = {
    active: "active",
    inactive: "Ngừng hoạt động",
    ended: "ended",
  };
  return <span className={`pill ${map[status] || "pill-neutral"}`}>{label[status] || status}</span>;
}

function ClassesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";
  const [, startTransition] = useTransition();

  const [items, setItems] = useState<LmsClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [statuses, setStatuses] = useState<string[]>(
    searchParams.getAll("status[]").length
      ? searchParams.getAll("status[]")
      : searchParams.get("status")
        ? [searchParams.get("status")!]
        : ["active"],
  );
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    code: "",
    program_id: "" as string,
    course_id: "" as string,
    schedule: "",
    time: "",
    room: "",
    days: [] as number[],
  });

  const { items: programs } = useCatalog("programs");
  const { items: allCourses } = useCatalog("courses");
  const filteredCourses = useMemo(() => {
    if (!form.program_id) return allCourses;
    return allCourses.filter((c) => String(c.program_id) === form.program_id);
  }, [allCourses, form.program_id]);

  const counts = useMemo(() => {
    const all = items.length;
    const active = items.filter((c) => c.status === "active").length;
    const inactive = items.filter((c) => c.status === "inactive").length;
    const ended = items.filter((c) => c.status === "ended").length;
    const operating = items.filter((c) => c.status === "active");
    const studentSum = operating.reduce((s, c) => s + (c.active_student_count || 0), 0);
    const fillRates = operating
      .map((c) => {
        const max = c.max_class_size || 15;
        return max > 0 ? ((c.active_student_count || 0) / max) * 100 : 0;
      })
      .filter((n) => !Number.isNaN(n));
    const avgFill =
      fillRates.length > 0
        ? Math.round((fillRates.reduce((a, b) => a + b, 0) / fillRates.length) * 10) / 10
        : 0;
    return { all, active, inactive, ended, studentSum, avgFill };
  }, [items]);

  function load() {
    const query = buildQuery({
      q,
      status: statuses,
    });
    router.replace(`/classes${query}`);
    setLoading(true);
    lmsApi
      .classes(query)
      .then((res) => {
        startTransition(() => {
          setItems(Array.isArray(res.data) ? res.data : []);
          setLoading(false);
        });
      })
      .catch((e) => {
        toast.error(e.message);
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setStatusFilter(next: string[], qOverride?: string) {
    const search = qOverride !== undefined ? qOverride : q;
    setStatuses(next);
    if (qOverride !== undefined) setQ(qOverride);
    const query = buildQuery({ q: search, status: next });
    router.replace(`/classes${query}`);
    setLoading(true);
    lmsApi
      .classes(query)
      .then((res) => {
        startTransition(() => {
          setItems(Array.isArray(res.data) ? res.data : []);
          setLoading(false);
        });
      })
      .catch((e) => {
        toast.error(e.message);
        setLoading(false);
      });
  }

  function toggleDay(day: number) {
    setForm((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day].sort(),
    }));
  }

  async function createClass(e: FormEvent) {
    e.preventDefault();
    try {
      await lmsApi.createClass({
        code: form.code,
        program_id: form.program_id ? Number(form.program_id) : null,
        course_id: form.course_id ? Number(form.course_id) : null,
        schedule: form.schedule || null,
        time: form.time || null,
        room: form.room || null,
        days: form.days,
      });
      toast.success("Đã tạo lớp");
      setShowCreate(false);
      setForm({ code: "", program_id: "", course_id: "", schedule: "", time: "", room: "", days: [] });
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi tạo lớp");
    }
  }

  async function endClass(id: number, code: string) {
    if (!confirm(`Xác nhận kết thúc lớp học ${code}?`)) return;
    try {
      await lmsApi.endClass(id);
      toast.success("Đã kết thúc lớp");
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi kết thúc lớp");
    }
  }

  async function setStatus(id: number, status: string) {
    try {
      await lmsApi.updateClassStatus(id, status);
      toast.success("Đã cập nhật trạng thái");
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi cập nhật");
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-col">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            <span>Học vụ</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Quản lý Lớp học</h1>
          <p className="mt-0.5 text-sm text-on-surface-variant">
            Danh sách các lớp đang giảng dạy và phân công phụ trách tại phân hiệu.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <button type="button" className="btn btn-ghost" disabled title="Sắp có">
            <Download className="h-4 w-4" />
            Xuất Excel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Thêm lớp học mới
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card flex items-center justify-between !p-4">
          <div className="flex flex-col">
            <span className="text-xs text-on-surface-variant">Tổng số lớp (kết quả lọc)</span>
            <span className="mt-1 text-2xl font-semibold text-foreground">{counts.all}</span>
            <span className="mt-1 flex items-center gap-0.5 text-[11px] font-semibold text-primary">
              <TrendingUp className="h-3.5 w-3.5" /> Theo bộ lọc hiện tại
            </span>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-low text-primary">
            <PlayCircle className="h-6 w-6" />
          </div>
        </div>
        <div className="card flex items-center justify-between !p-4">
          <div className="flex flex-col">
            <span className="text-xs text-on-surface-variant">Lớp đang vận hành</span>
            <span className="mt-1 text-2xl font-semibold text-primary">{counts.active}</span>
            <span className="mt-1 text-[11px] text-on-surface-variant">
              {counts.studentSum} học viên hoạt động
            </span>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary-dark">
            <PlayCircle className="h-6 w-6" />
          </div>
        </div>
        <div className="card flex items-center justify-between !p-4">
          <div className="flex flex-col">
            <span className="text-xs text-on-surface-variant">Tỷ lệ lấp đầy TB</span>
            <span className="mt-1 text-2xl font-semibold text-foreground">{counts.avgFill}%</span>
            <span className="mt-1 text-[11px] font-semibold text-primary">Chuẩn 5 - 15 HV/lớp</span>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-low text-secondary">
            <UserCheck className="h-6 w-6" />
          </div>
        </div>
        <div className="card flex items-center justify-between !p-4">
          <div className="flex flex-col">
            <span className="text-xs text-on-surface-variant">Lớp đã kết thúc</span>
            <span className="mt-1 text-2xl font-semibold text-on-surface-variant">{counts.ended}</span>
            <span className="mt-1 text-[11px] text-secondary">Đã chốt sổ đánh giá</span>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-low text-secondary">
            <XCircle className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="card flex flex-col gap-4 !p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-low p-1.5">
          <div className="flex items-center gap-1 overflow-x-auto">
            {(
              [
                { key: "all", label: "Tất cả", value: [] as string[] },
                { key: "active", label: "Đang hoạt động", value: ["active"] },
                { key: "inactive", label: "Ngừng hoạt động", value: ["inactive"] },
                { key: "ended", label: "Đã kết thúc", value: ["ended"] },
              ] as const
            ).map((tab) => {
              const selected =
                tab.value.length === 0
                  ? statuses.length === 0
                  : statuses.length === 1 && statuses[0] === tab.value[0];
              return (
                <button
                  key={tab.key}
                  type="button"
                  className={cn(
                    "whitespace-nowrap rounded-md px-4 py-1.5 text-xs font-semibold transition-colors",
                    selected
                      ? "bg-surface text-primary shadow-sm"
                      : "text-on-surface-variant hover:text-foreground",
                  )}
                  onClick={() => setStatusFilter([...tab.value])}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2 lg:grid-cols-12">
          <div className="relative lg:col-span-5">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <input
              className="input pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo mã lớp (STX-...), tên khóa học..."
              type="text"
            />
          </div>
          <div className="flex items-center justify-end gap-1.5 lg:col-span-7">
            <button type="button" className="btn btn-ghost h-10" onClick={load}>
              <Filter className="h-4 w-4" />
              Lọc
            </button>
            <button
              type="button"
              className="btn btn-ghost h-10 !px-2"
              title="Đặt lại bộ lọc"
              onClick={() => setStatusFilter(["active"], "")}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-xl bg-surface shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-low text-xs font-semibold text-on-surface-variant">
                <th className="whitespace-nowrap px-4 py-3">Mã Lớp</th>
                <th className="whitespace-nowrap px-4 py-3">Khóa học & Chương trình</th>
                <th className="whitespace-nowrap px-4 py-3">Lịch học</th>
                <th className="whitespace-nowrap px-4 py-3">Phòng học</th>
                <th className="whitespace-nowrap px-4 py-3 w-44">Sĩ số (Chuẩn 5-15)</th>
                <th className="whitespace-nowrap px-4 py-3 text-center">Trạng thái</th>
                <th className="whitespace-nowrap px-4 py-3 pr-6 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-low text-foreground">
              {items.map((c) => {
                const max = c.max_class_size || 15;
                const pct = max > 0 ? Math.round(((c.active_student_count || 0) / max) * 100) : 0;
                return (
                  <tr
                    key={c.id}
                    className={cn(
                      "transition-colors hover:bg-surface-low/60",
                      c.status === "ended" && "opacity-75",
                    )}
                  >
                    <td className="px-4 py-3.5 font-semibold">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary-dark">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {c.code}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-semibold">{c.course || "—"}</span>
                        <span className="text-[11px] text-on-surface-variant">{c.program || ""}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-medium">{c.schedule || "—"}</span>
                        <span className="text-[11px] text-on-surface-variant">{c.time || ""}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded bg-surface-low px-2 py-1 font-mono text-xs">
                        {c.room || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span>
                            {c.active_student_count}/{max} HV
                          </span>
                          <span className="text-primary">{pct}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-low">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        {c.below_min_size ? (
                          <span className="text-[11px] text-warn">Chưa đủ tối thiểu 5</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <StatusPill status={c.status} />
                    </td>
                    <td className="px-4 py-3.5 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!c.is_locked ? (
                          <Link
                            href={`/attendance?class_id=${c.id}`}
                            className="btn btn-primary !px-2.5 !py-1 text-[11px]"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            Điểm danh
                          </Link>
                        ) : null}
                        <Link
                          href={`/classes/${c.id}`}
                          className="rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-surface-low hover:text-foreground"
                          title="Xem chi tiết"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {!c.is_locked ? (
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-danger transition-colors hover:bg-danger-container"
                            title="Kết thúc lớp"
                            onClick={() => endClass(c.id, c.code)}
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        ) : null}
                        {isAdmin ? (
                          <select
                            className="input !h-8 !w-auto !py-0 text-[11px]"
                            value={c.status}
                            onChange={(e) => setStatus(c.id, e.target.value)}
                          >
                            <option value="active">active</option>
                            <option value="inactive">inactive</option>
                            <option value="ended">ended</option>
                          </select>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-2 bg-surface-low/40 p-4">
          <span className="text-xs text-on-surface-variant">
            {loading
              ? "Đang tải..."
              : `Hiển thị ${items.length} lớp học`}
          </span>
        </div>
      </div>

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#213145]/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={createClass}
            className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface shadow-xl"
          >
            <div className="flex items-center justify-between bg-surface-low px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Plus className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-lg font-semibold text-foreground">Tạo Lớp học mới</h3>
                  <span className="text-xs text-on-surface-variant">
                    Khởi tạo kế hoạch giảng dạy và xếp lịch
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-high"
                onClick={() => setShowCreate(false)}
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Mã Lớp Học <span className="text-danger">*</span>
                  </label>
                  <input
                    className="input uppercase font-semibold"
                    required
                    placeholder="VD: STX-SCRATCH-08"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Chương trình đào tạo
                  </label>
                  <select
                    className="input"
                    value={form.program_id}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        program_id: e.target.value,
                        course_id: "",
                      }))
                    }
                  >
                    <option value="">— Chương trình —</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Khóa học</label>
                  <select
                    className="input"
                    value={form.course_id}
                    onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                  >
                    <option value="">— Khóa học —</option>
                    {filteredCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Phòng học</label>
                  <input
                    className="input"
                    placeholder="Lab 02"
                    value={form.room}
                    onChange={(e) => setForm({ ...form, room: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-foreground">
                  Ngày học trong tuần
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((label, idx) => (
                    <button
                      key={label}
                      type="button"
                      className={cn(
                        "flex h-10 items-center justify-center rounded-lg text-xs font-semibold transition-all",
                        form.days.includes(idx)
                          ? "bg-primary text-on-primary"
                          : "bg-surface-low text-foreground",
                      )}
                      onClick={() => toggleDay(idx)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Khung giờ học</label>
                  <input
                    className="input"
                    placeholder="18:00 - 19:30"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Mô tả lịch</label>
                  <input
                    className="input"
                    placeholder="T3 - T5 - T7"
                    value={form.schedule}
                    onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-surface-low px-6 py-4">
              <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary">
                Lưu & Kích hoạt lớp
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export default function ClassesPage() {
  return (
    <Suspense fallback={<div className="text-sm text-on-surface-variant">Đang tải...</div>}>
      <ClassesContent />
    </Suspense>
  );
}
