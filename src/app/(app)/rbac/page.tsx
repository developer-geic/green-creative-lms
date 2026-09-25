"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SelectField } from "@/components/SelectField";
import { usePermissions, invalidateMeCache } from "@/hooks/usePermissions";
import { lmsApi } from "@/lib/api";
import type { LmsMenuItem, LmsRbacPermission, LmsRbacRole } from "@/types/lms";

type Tab = "permissions" | "roles" | "menus";

export default function RbacPage() {
  const router = useRouter();
  const { can, ready, isAdmin } = usePermissions();
  const canCreate = can("rbac.create");
  const canUpdate = can("rbac.update");
  const canDelete = can("rbac.delete");
  const [tab, setTab] = useState<Tab>("roles");
  const [permissions, setPermissions] = useState<LmsRbacPermission[]>([]);
  const [roles, setRoles] = useState<LmsRbacRole[]>([]);
  const [menus, setMenus] = useState<LmsMenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!isAdmin && !can("rbac.view") && !can("manage.rbac")) {
      toast.error("Bạn không có quyền quản lý RBAC");
      router.replace("/dashboard");
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  async function loadAll() {
    setLoading(true);
    try {
      const [p, r, m] = await Promise.all([
        lmsApi.rbacPermissions(),
        lmsApi.rbacRoles(),
        lmsApi.rbacMenus(),
      ]);
      setPermissions(p.data || []);
      setRoles(r.data || []);
      setMenus(m.data || []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không tải được RBAC");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-primary-dark">Quyền · Vai trò · Menu</h1>
        <p className="text-sm text-on-surface-variant">
          Cấu hình động quyền truy cập và menu sidebar — không cần sửa code.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl bg-surface-low p-1">
        {(
          [
            ["roles", "Vai trò"],
            ["permissions", "Quyền"],
            ["menus", "Menu"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`rounded-lg px-3.5 py-2 text-sm font-medium ${
              tab === id
                ? "bg-surface text-primary-dark shadow-sm"
                : "text-on-surface-variant hover:text-foreground"
            }`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card text-sm text-on-surface-variant">Đang tải…</div>
      ) : tab === "permissions" ? (
        <PermissionsTab
          items={permissions}
          onChanged={loadAll}
          canCreate={canCreate}
          canDelete={canDelete}
        />
      ) : tab === "roles" ? (
        <RolesTab
          roles={roles}
          permissions={permissions}
          onChanged={loadAll}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
        />
      ) : (
        <MenusTab
          menus={menus}
          permissions={permissions}
          onChanged={loadAll}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
        />
      )}
    </div>
  );
}

function PermissionsTab({
  items,
  onChanged,
  canCreate = true,
  canDelete = true,
}: {
  items: LmsRbacPermission[];
  onChanged: () => void;
  canCreate?: boolean;
  canDelete?: boolean;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [group, setGroup] = useState("feature");
  const [saving, setSaving] = useState(false);

  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await lmsApi.createRbacPermission({ name, code, group });
      toast.success("Đã thêm quyền");
      setName("");
      setCode("");
      onChanged();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: LmsRbacPermission) {
    if (item.is_system) return;
    if (!confirm(`Xóa quyền ${item.code}?`)) return;
    try {
      await lmsApi.deleteRbacPermission(item.id);
      toast.success("Đã xóa");
      onChanged();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    }
  }

  return (
    <div className="space-y-4">
      {canCreate ? (
      <form onSubmit={create} className="card grid gap-3 sm:grid-cols-4">
        <input
          className="input"
          placeholder="Mã (vd: manage.foo)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <input
          className="input"
          placeholder="Tên hiển thị"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <SelectField
          value={group}
          options={[
            { value: "menu", label: "menu" },
            { value: "catalog", label: "catalog" },
            { value: "feature", label: "feature" },
          ]}
          onChange={setGroup}
        />
        <button type="submit" className="btn btn-primary" disabled={saving}>
          <Plus className="h-4 w-4" />
          Thêm
        </button>
      </form>
      ) : null}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-on-surface-variant">
              <th className="py-2">Mã</th>
              <th>Tên</th>
              <th>Nhóm</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-b border-surface-low">
                <td className="py-2 font-mono text-xs">{p.code}</td>
                <td>{p.name}</td>
                <td>{p.group}</td>
                <td className="text-right">
                  {!p.is_system && canDelete ? (
                    <button
                      type="button"
                      className="rounded p-1.5 text-danger"
                      onClick={() => remove(p)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : p.is_system ? (
                    <span className="text-[11px] text-on-surface-variant">system</span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RolesTab({
  roles,
  permissions,
  onChanged,
  canCreate = true,
  canUpdate = true,
  canDelete = true,
}: {
  roles: LmsRbacRole[];
  permissions: LmsRbacPermission[];
  onChanged: () => void;
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}) {
  const [editing, setEditing] = useState<LmsRbacRole | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      {canCreate ? (
      <div className="flex justify-end">
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Thêm vai trò
        </button>
      </div>
      ) : null}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-on-surface-variant">
              <th className="py-2">Mã</th>
              <th>Tên</th>
              <th>Quyền</th>
              <th>Users</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id} className="border-b border-surface-low">
                <td className="py-2 font-mono text-xs">{r.code}</td>
                <td>{r.name}</td>
                <td className="text-xs text-on-surface-variant">
                  {(r.permissions || []).length} quyền
                </td>
                <td>{r.users_count ?? 0}</td>
                <td className="text-right">
                  {canUpdate ? (
                  <button
                    type="button"
                    className="rounded p-1.5 text-on-surface-variant hover:bg-surface-low"
                    onClick={() => setEditing(r)}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  ) : null}
                  {!r.is_system && canDelete ? (
                    <button
                      type="button"
                      className="rounded p-1.5 text-danger"
                      onClick={async () => {
                        if (!confirm(`Xóa vai trò ${r.name}?`)) return;
                        try {
                          await lmsApi.deleteRbacRole(r.id);
                          toast.success("Đã xóa");
                          onChanged();
                        } catch (e: unknown) {
                          toast.error(e instanceof Error ? e.message : "Lỗi");
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(editing || creating) && (
        <RoleEditor
          role={editing}
          permissions={permissions}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            invalidateMeCache();
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function RoleEditor({
  role,
  permissions,
  onClose,
  onSaved,
}: {
  role: LmsRbacRole | null;
  permissions: LmsRbacPermission[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(role?.code || "");
  const [name, setName] = useState(role?.name || "");
  const [description, setDescription] = useState(role?.description || "");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set((role?.permissions || []).map((p) => p.code)),
  );
  const [saving, setSaving] = useState(false);

  const byGroup = useMemo(() => {
    const map = new Map<string, LmsRbacPermission[]>();
    permissions.forEach((p) => {
      const list = map.get(p.group) || [];
      list.push(p);
      map.set(p.group, list);
    });
    return [...map.entries()];
  }, [permissions]);

  function toggle(codeVal: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(codeVal)) next.delete(codeVal);
      else next.add(codeVal);
      return next;
    });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        code,
        name,
        description: description || null,
        permission_codes: [...selected],
      };
      if (role) {
        await lmsApi.updateRbacRole(role.id, body);
        toast.success("Đã cập nhật vai trò");
      } else {
        await lmsApi.createRbacRole(body);
        toast.success("Đã tạo vai trò");
      }
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={save}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface shadow-xl"
      >
        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-semibold">{role ? "Sửa vai trò" : "Thêm vai trò"}</h2>
        </div>
        <div className="space-y-3 overflow-y-auto px-5 py-4">
          <input
            className="input w-full"
            placeholder="Mã"
            value={code}
            disabled={Boolean(role?.is_system)}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <input
            className="input w-full"
            placeholder="Tên"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <textarea
            className="input min-h-[64px] w-full"
            placeholder="Mô tả"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {byGroup.map(([group, list]) => (
            <div key={group}>
              <div className="mb-1 text-xs font-semibold uppercase text-on-surface-variant">
                {group}
              </div>
              <div className="grid gap-1 sm:grid-cols-2">
                {list.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.has(p.code)}
                      onChange={() => toggle(p.code)}
                    />
                    <span>
                      {p.name}{" "}
                      <span className="font-mono text-[10px] text-on-surface-variant">
                        {p.code}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Huỷ
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            Lưu
          </button>
        </div>
      </form>
    </div>
  );
}

function MenusTab({
  menus,
  permissions,
  onChanged,
  canCreate = true,
  canUpdate = true,
  canDelete = true,
}: {
  menus: LmsMenuItem[];
  permissions: LmsRbacPermission[];
  onChanged: () => void;
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}) {
  const [editing, setEditing] = useState<LmsMenuItem | null>(null);

  return (
    <div className="space-y-4">
      {canCreate ? (
      <div className="flex justify-end">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            setEditing({
              id: 0,
              label: "",
              href: "/",
              icon: "LayoutDashboard",
              permission_code: null,
              placement: "sidebar",
              sort_order: 0,
              is_active: true,
            })
          }
        >
          <Plus className="h-4 w-4" />
          Thêm menu
        </button>
      </div>
      ) : null}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-on-surface-variant">
              <th className="py-2">Label</th>
              <th>Href</th>
              <th>Icon</th>
              <th>Permission</th>
              <th>Vị trí</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {menus.map((m) => (
              <tr key={m.id} className="border-b border-surface-low">
                <td className="py-2">{m.label}</td>
                <td className="font-mono text-xs">{m.href}</td>
                <td>{m.icon}</td>
                <td className="font-mono text-xs">{m.permission_code || "—"}</td>
                <td>{m.placement}</td>
                <td>{m.is_active ? "Yes" : "No"}</td>
                <td className="text-right">
                  {canUpdate ? (
                  <button
                    type="button"
                    className="rounded p-1.5"
                    onClick={() => setEditing(m)}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  ) : null}
                  {canDelete ? (
                  <button
                    type="button"
                    className="rounded p-1.5 text-danger"
                    onClick={async () => {
                      if (!confirm(`Xóa menu ${m.label}?`)) return;
                      try {
                        await lmsApi.deleteRbacMenu(m.id);
                        invalidateMeCache();
                        toast.success("Đã xóa");
                        onChanged();
                      } catch (e: unknown) {
                        toast.error(e instanceof Error ? e.message : "Lỗi");
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <MenuEditor
          menu={editing}
          permissions={permissions}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            invalidateMeCache();
            onChanged();
          }}
        />
      ) : null}
    </div>
  );
}

function MenuEditor({
  menu,
  permissions,
  onClose,
  onSaved,
}: {
  menu: LmsMenuItem;
  permissions: LmsRbacPermission[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    label: menu.label,
    href: menu.href,
    icon: menu.icon || "",
    permission_code: menu.permission_code || "",
    placement: menu.placement || "sidebar",
    sort_order: String(menu.sort_order ?? 0),
    is_active: menu.is_active !== false,
  });
  const [saving, setSaving] = useState(false);
  const isNew = !menu.id;

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        label: form.label,
        href: form.href,
        icon: form.icon || null,
        permission_code: form.permission_code || null,
        placement: form.placement,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      };
      if (isNew) {
        await lmsApi.createRbacMenu(body);
        toast.success("Đã thêm menu");
      } else {
        await lmsApi.updateRbacMenu(menu.id, body);
        toast.success("Đã cập nhật menu");
      }
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={save}
        className="w-full max-w-lg space-y-3 rounded-2xl bg-surface p-5 shadow-xl"
      >
        <h2 className="text-lg font-semibold">{isNew ? "Thêm menu" : "Sửa menu"}</h2>
        <input
          className="input w-full"
          placeholder="Label"
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          required
        />
        <input
          className="input w-full"
          placeholder="Href"
          value={form.href}
          onChange={(e) => setForm((f) => ({ ...f, href: e.target.value }))}
          required
        />
        <input
          className="input w-full"
          placeholder="Icon (Lucide name)"
          value={form.icon}
          onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
        />
        <SelectField
          value={form.permission_code}
          options={[
            { value: "", label: "— Không cần quyền (luôn hiện) —" },
            ...permissions.map((p) => ({
              value: p.code,
              label: `${p.code} — ${p.name}`,
            })),
          ]}
          onChange={(v) => setForm((f) => ({ ...f, permission_code: v }))}
        />
        <SelectField
          value={form.placement}
          options={[
            { value: "sidebar", label: "sidebar" },
            { value: "bottom", label: "bottom" },
          ]}
          onChange={(v) => setForm((f) => ({ ...f, placement: v }))}
        />
        <input
          className="input w-full"
          type="number"
          placeholder="Sort"
          value={form.sort_order}
          onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
          />
          Active
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Huỷ
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            Lưu
          </button>
        </div>
      </form>
    </div>
  );
}
