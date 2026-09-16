"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { lmsApi } from "@/lib/api";
import { buildQuery } from "@/lib/utils";
import type { LmsClass } from "@/types/lms";

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "pill-good",
    inactive: "pill-neutral",
    ended: "pill-warn",
  };
  const label: Record<string, string> = {
    active: "Đang hoạt động",
    inactive: "Ngừng hoạt động",
    ended: "Đã kết thúc",
  };
  return <span className={`pill ${map[status] || "pill-neutral"}`}>{label[status] || status}</span>;
}

function ClassesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  const [items, setItems] = useState<LmsClass[]>([]);
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [statuses, setStatuses] = useState<string[]>(
    searchParams.getAll("status[]").length
      ? searchParams.getAll("status[]")
      : searchParams.get("status")
        ? [searchParams.get("status")!]
        : [],
  );
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    code: "",
    program: "",
    course: "",
    schedule: "",
    time: "",
    room: "",
    days: [] as number[],
  });

  function load() {
    const query = buildQuery({
      q,
      status: statuses,
    });
    router.replace(`/classes${query}`);
    lmsApi
      .classes(query)
      .then((res) => setItems(Array.isArray(res.data) ? res.data : []))
      .catch((e) => toast.error(e.message));
  }

  useEffect(() => {
    load();
  }, []);

  function toggleStatus(status: string) {
    setStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
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
      await lmsApi.createClass(form);
      toast.success("Đã tạo lớp");
      setShowCreate(false);
      setForm({ code: "", program: "", course: "", schedule: "", time: "", room: "", days: [] });
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function endClass(id: number) {
    if (!confirm("Kết thúc lớp này?")) return;
    try {
      await lmsApi.endClass(id);
      toast.success("Đã kết thúc lớp");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function setStatus(id: number, status: string) {
    try {
      await lmsApi.updateClassStatus(id, status);
      toast.success("Đã cập nhật trạng thái");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary-dark">Lớp học</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          Thêm lớp
        </button>
      </div>

      <div className="card flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs text-slate-500">Tìm kiếm</label>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mã lớp, khoá học..." />
        </div>
        <div className="space-y-1">
          <div className="text-xs text-slate-500">Trạng thái (đa chọn)</div>
          <div className="flex gap-2">
            {(["active", "inactive", "ended"] as const).map((s) => (
              <label key={s} className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={statuses.includes(s)} onChange={() => toggleStatus(s)} />
                {s === "active" ? "Đang hoạt động" : s === "inactive" ? "Ngừng hoạt động" : "Đã kết thúc"}
              </label>
            ))}
          </div>
        </div>
        <button className="btn btn-primary" onClick={load}>
          Lọc
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-slate-500">
              <th className="py-2">Mã lớp</th>
              <th>Khoá học</th>
              <th>Lịch</th>
              <th>Sĩ số</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-b border-border/70">
                <td className="py-3 font-medium">
                  <Link className="text-primary-dark hover:underline" href={`/classes/${c.id}`}>
                    {c.code}
                  </Link>
                </td>
                <td>
                  <div>{c.course || "—"}</div>
                  <div className="text-xs text-slate-500">{c.program}</div>
                </td>
                <td>
                  {c.schedule || "—"}
                  <div className="text-xs text-slate-500">{c.time}</div>
                </td>
                <td>
                  {c.active_student_count}/{c.max_class_size || 15}
                  {c.below_min_size && <div className="text-xs text-amber-600">Chưa đủ 5</div>}
                </td>
                <td>
                  <StatusPill status={c.status} />
                </td>
                <td className="space-x-2 whitespace-nowrap">
                  {!c.is_locked && (
                    <button className="btn btn-danger !px-2 !py-1 text-xs" onClick={() => endClass(c.id)}>
                      Kết thúc lớp
                    </button>
                  )}
                  {isAdmin && (
                    <select
                      className="input !w-auto !py-1 text-xs"
                      value={c.status}
                      onChange={(e) => setStatus(c.id, e.target.value)}
                    >
                      <option value="active">Đang hoạt động</option>
                      <option value="inactive">Ngừng hoạt động</option>
                      <option value="ended">Đã kết thúc</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <p className="py-6 text-center text-sm text-slate-500">Không có lớp.</p>}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={createClass} className="card w-full max-w-lg space-y-3">
            <h2 className="font-semibold">Thêm lớp học</h2>
            <input className="input" required placeholder="Mã lớp" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <input className="input" placeholder="Chương trình" value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} />
            <input className="input" placeholder="Khoá học" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} />
            <input className="input" placeholder="Lịch (T2-4-6)" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} />
            <input className="input" placeholder="Giờ học" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            <input className="input" placeholder="Phòng" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
            <div>
              <div className="mb-1 text-xs text-slate-500">Ngày học trong tuần</div>
              <div className="flex flex-wrap gap-2">
                {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((label, idx) => (
                  <button
                    key={label}
                    type="button"
                    className={`btn ${form.days.includes(idx) ? "btn-primary" : "btn-ghost"} !px-2 !py-1`}
                    onClick={() => toggleDay(idx)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                Huỷ
              </button>
              <button className="btn btn-primary">Tạo lớp</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function ClassesPage() {
  return (
    <Suspense fallback={<div>Đang tải...</div>}>
      <ClassesContent />
    </Suspense>
  );
}
