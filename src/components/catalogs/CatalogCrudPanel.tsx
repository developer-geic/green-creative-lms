"use client";

import { FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { lmsApi } from "@/lib/api";
import { invalidateCatalogCache } from "@/hooks/useCatalog";
import type { LmsCatalogItem } from "@/types/lms";

type Mode = "programs" | "courses" | "statuses" | "absorption";

const API = {
  programs: {
    create: lmsApi.createCatalogProgram,
    update: lmsApi.updateCatalogProgram,
    remove: lmsApi.deleteCatalogProgram,
    cache: "programs" as const,
  },
  courses: {
    create: lmsApi.createCatalogCourse,
    update: lmsApi.updateCatalogCourse,
    remove: lmsApi.deleteCatalogCourse,
    cache: "courses" as const,
  },
  statuses: {
    create: lmsApi.createCatalogStatus,
    update: lmsApi.updateCatalogStatus,
    remove: lmsApi.deleteCatalogStatus,
    cache: "student-statuses" as const,
  },
  absorption: {
    create: lmsApi.createCatalogAbsorption,
    update: lmsApi.updateCatalogAbsorption,
    remove: lmsApi.deleteCatalogAbsorption,
    cache: "absorption-levels" as const,
  },
};

export function CatalogCrudPanel({
  mode,
  items,
  loading,
  programs,
  onChanged,
  canCreate = true,
  canUpdate = true,
  canDelete = true,
}: {
  mode: Mode;
  items: LmsCatalogItem[];
  loading: boolean;
  programs?: LmsCatalogItem[];
  onChanged: () => void;
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [programId, setProgramId] = useState("");
  const [color, setColor] = useState("");
  const [editing, setEditing] = useState<LmsCatalogItem | null>(null);

  function resetForm() {
    setName("");
    setProgramId("");
    setColor("");
    setEditing(null);
  }

  function startEdit(item: LmsCatalogItem) {
    setEditing(item);
    setName(item.name);
    setProgramId(item.program_id ? String(item.program_id) : "");
    setColor(item.color || "");
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const body: Record<string, unknown> = {
          name,
          is_active: true,
        };
        if (mode === "courses") {
          body.program_id = programId ? Number(programId) : null;
        }
        if (mode === "statuses" && color) {
          body.color = color;
        }
        const api = API[mode];
        if (editing) {
          await api.update(editing.id, body);
          toast.success("Đã cập nhật");
        } else {
          await api.create(body);
          toast.success("Đã thêm");
        }
        invalidateCatalogCache(api.cache);
        resetForm();
        onChanged();
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  }

  function remove(item: LmsCatalogItem) {
    if (item.is_system) return;
    if (!confirm(`Xóa "${item.name}"?`)) return;
    startTransition(async () => {
      try {
        await API[mode].remove(item.id);
        invalidateCatalogCache(API[mode].cache);
        toast.success("Đã xóa");
        onChanged();
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  }

  async function toggleActive(item: LmsCatalogItem) {
    startTransition(async () => {
      try {
        await API[mode].update(item.id, { is_active: !item.is_active });
        invalidateCatalogCache(API[mode].cache);
        onChanged();
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      {canCreate || (editing && canUpdate) ? (
      <form onSubmit={submit} className="card grid gap-3 md:grid-cols-2">
        {editing ? (
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-semibold text-on-surface-variant">Mã (không đổi)</label>
            <input className="input font-mono text-xs" value={editing.code} disabled readOnly />
          </div>
        ) : (
          <p className="text-xs text-on-surface-variant md:col-span-2">
            Mã được tạo tự động từ tên hiển thị.
          </p>
        )}
        <input
          className="input md:col-span-2"
          required
          placeholder="Tên hiển thị"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {mode === "courses" && (
          <select
            className="input md:col-span-2"
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
          >
            <option value="">— Chương trình (tuỳ chọn) —</option>
            {(programs || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        {mode === "statuses" && (
          <input
            className="input md:col-span-2"
            placeholder="Màu (tuỳ chọn, vd. #16a34a)"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        )}
        <div className="flex gap-2 md:col-span-2">
          <button className="btn btn-primary" disabled={pending}>
            {editing ? "Lưu" : "Thêm"}
          </button>
          {editing && (
            <button type="button" className="btn btn-ghost" onClick={resetForm}>
              Huỷ
            </button>
          )}
        </div>
      </form>
      ) : null}

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-slate-500">
                <th className="py-2">Mã</th>
                <th>Tên</th>
                {mode === "courses" && <th>Chương trình</th>}
                <th>TT</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border/70">
                  <td className="py-2 font-mono text-xs">{item.code}</td>
                  <td className="font-medium">{item.name}</td>
                  {mode === "courses" && (
                    <td>{item.program?.name || "—"}</td>
                  )}
                  <td>
                    {canUpdate ? (
                      <button
                        type="button"
                        className={`pill ${item.is_active ? "pill-good" : "pill-neutral"}`}
                        onClick={() => toggleActive(item)}
                      >
                        {item.is_active ? "Active" : "Off"}
                      </button>
                    ) : (
                      <span className={`pill ${item.is_active ? "pill-good" : "pill-neutral"}`}>
                        {item.is_active ? "Active" : "Off"}
                      </span>
                    )}
                  </td>
                  <td className="space-x-2 text-right">
                    {canUpdate ? (
                      <button type="button" className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => startEdit(item)}>
                        Sửa
                      </button>
                    ) : null}
                    {canDelete && !item.is_system ? (
                      <button
                        type="button"
                        className="btn btn-danger !px-2 !py-1 text-xs"
                        onClick={() => remove(item)}
                      >
                        Xóa
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && !items.length && (
          <p className="py-6 text-center text-sm text-slate-500">Chưa có mục nào. Thêm ở form phía trên.</p>
        )}
      </div>
    </div>
  );
}
