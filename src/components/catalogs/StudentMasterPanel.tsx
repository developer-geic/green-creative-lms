"use client";

import { FormEvent, useDeferredValue, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { lmsApi } from "@/lib/api";

export function StudentMasterPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    full_name: "",
    english_name: "",
    parent_phone: "",
    notes: "",
  });

  function load(q = deferredQuery) {
    setLoading(true);
    const qs = q ? `?q=${encodeURIComponent(q)}&limit=100` : "?limit=100";
    lmsApi
      .students(qs)
      .then((res) => setItems(res.data || []))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(deferredQuery);
  }, [deferredQuery]);

  const filtered = items;

  function submit(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await lmsApi.createStudent(form);
        toast.success("Đã thêm học viên");
        setForm({ full_name: "", english_name: "", parent_phone: "", notes: "" });
        load();
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="card grid gap-3 md:grid-cols-2">
        <input
          className="input"
          required
          placeholder="Họ tên"
          value={form.full_name}
          onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
        />
        <input
          className="input"
          placeholder="Tên tiếng Anh"
          value={form.english_name}
          onChange={(e) => setForm((f) => ({ ...f, english_name: e.target.value }))}
        />
        <input
          className="input"
          placeholder="SĐT phụ huynh"
          value={form.parent_phone}
          onChange={(e) => setForm((f) => ({ ...f, parent_phone: e.target.value }))}
        />
        <input
          className="input"
          placeholder="Ghi chú"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
        <button className="btn btn-primary md:col-span-2" disabled={pending}>
          Thêm học viên master
        </button>
      </form>

      <div className="card space-y-3">
        <input
          className="input max-w-sm"
          placeholder="Tìm học viên..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto" style={{ contentVisibility: "auto" }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-slate-500">
                  <th className="py-2">Họ tên</th>
                  <th>SĐT PH</th>
                  <th>Lớp đã enroll</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-border/70">
                    <td className="py-2 font-medium">{s.full_name}</td>
                    <td>{s.parent_phone || "—"}</td>
                    <td className="text-xs text-slate-500">
                      {(s.enrollments || [])
                        .map((e: any) => `${e.class_code || e.class_id} (${e.status_name || e.status})`)
                        .join(", ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <p className="py-6 text-center text-sm text-slate-500">Chưa có học viên. Thêm ở form phía trên.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
