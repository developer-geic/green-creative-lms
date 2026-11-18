"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { AvatarThumb } from "@/components/AvatarEditor";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { lmsApi } from "@/lib/api";
import {
  roleLabel,
  userStatusLabel,
  userStatusPillClass,
} from "./[id]/user-detail-fields";

type UserRow = {
  id: number;
  name?: string;
  email: string;
  role: string;
  status: string;
  avatar?: string | null;
};

type PendingConfirm =
  | { type: "disable"; user: UserRow }
  | { type: "enable"; user: UserRow }
  | { type: "reset"; user: UserRow }
  | null;

export default function UsersPage() {
  const { data: session } = useSession();
  const { can } = usePermissions();
  const canCreate = can("users.create");
  const canUpdate = can("users.update");
  const [items, setItems] = useState<UserRow[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("teacher");
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null);
  const [actionPending, startAction] = useTransition();

  function load() {
    lmsApi
      .users("?limit=100")
      .then((res) => setItems(res.data || []))
      .catch((e) => toast.error(e.message));
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await lmsApi.createUser({ email, name, role });
      toast.success("Đã thêm tài khoản");
      setEmail("");
      setName("");
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi tạo tài khoản");
    }
  }

  async function approve(id: number) {
    try {
      await lmsApi.approveUser(id, "teacher");
      toast.success("Đã duyệt");
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Lỗi duyệt");
    }
  }

  function runConfirm() {
    if (!pendingConfirm) return;
    const { type, user } = pendingConfirm;
    startAction(async () => {
      try {
        if (type === "disable") {
          await lmsApi.updateUser(user.id, { status: "disabled" });
          toast.success("Đã vô hiệu hóa tài khoản");
        } else if (type === "reset") {
          await lmsApi.resetUserPassword(user.id);
          toast.success("Đã reset mật khẩu");
        } else {
          await lmsApi.updateUser(user.id, { status: "approved" });
          toast.success("Đã kích hoạt lại tài khoản");
        }
        setPendingConfirm(null);
        load();
      } catch (e: unknown) {
        toast.error(
          e instanceof Error
            ? e.message
            : (e as { message?: string })?.message || "Không cập nhật được trạng thái",
        );
      }
    });
  }

  const sessionUserId = session?.user?.id;
  const pending = items.filter((u) => u.status === "pending");
  const others = items.filter((u) => u.status !== "pending");

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
          Phân quyền & Kiểm soát truy cập
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Quản lý Người dùng & Phân quyền
        </h1>
      </div>

      {canCreate ? (
        <form onSubmit={create} className="card flex flex-wrap gap-3 !p-4">
          <input
            className="input w-full sm:max-w-xs"
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="input w-full sm:max-w-xs"
            placeholder="Họ tên"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className="input w-full sm:max-w-[160px]"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="teacher">Giáo viên</option>
            <option value="admin">Admin</option>
          </select>
          <button className="btn btn-primary w-full sm:w-auto">+ Tạo người dùng mới</button>
        </form>
      ) : null}

      {pending.length > 0 && canUpdate ? (
        <div className="card">
          <h2 className="mb-3 text-lg font-bold">Chờ duyệt ({pending.length})</h2>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {pending.map((u) => (
              <div
                key={u.id}
                className="flex flex-col justify-between rounded-xl bg-surface-low p-4"
              >
                <div className="flex items-center gap-3">
                  <AvatarThumb path={u.avatar} name={u.name || u.email} size="sm" />
                  <div>
                    <div className="font-bold text-foreground">{u.name || "—"}</div>
                    <div className="text-xs text-on-surface-variant">{u.email}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary mt-4 w-full"
                  onClick={() => approve(u.id)}
                >
                  Duyệt tài khoản
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl bg-surface shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-low text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                <th className="px-4 py-3.5">Người dùng & Email</th>
                <th className="px-4 py-3.5">Vai trò</th>
                <th className="px-4 py-3.5">Trạng thái</th>
                <th className="px-4 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-low/60">
              {others.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-surface-low/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <AvatarThumb path={u.avatar} name={u.name || u.email} size="sm" />
                      <div>
                        <Link
                          className="font-semibold hover:text-primary"
                          href={`/users/${u.id}`}
                        >
                          {u.name || "—"}
                        </Link>
                        <div className="text-xs text-on-surface-variant">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="pill pill-good">{roleLabel(u.role)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={userStatusPillClass(u.status)}>
                      {userStatusLabel(u.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {canUpdate &&
                      u.status !== "pending" &&
                      Number(sessionUserId) !== u.id ? (
                        <button
                          type="button"
                          className="text-xs font-semibold text-on-surface-variant hover:underline"
                          onClick={() => setPendingConfirm({ type: "reset", user: u })}
                        >
                          Reset MK
                        </button>
                      ) : null}
                      {canUpdate && u.status === "approved" ? (
                        <button
                          type="button"
                          className="text-xs font-semibold text-amber-800 hover:underline"
                          onClick={() => setPendingConfirm({ type: "disable", user: u })}
                        >
                          Vô hiệu
                        </button>
                      ) : null}
                      {canUpdate && u.status === "disabled" ? (
                        <button
                          type="button"
                          className="text-xs font-semibold text-primary hover:underline"
                          onClick={() => setPendingConfirm({ type: "enable", user: u })}
                        >
                          Kích hoạt
                        </button>
                      ) : null}
                      <Link
                        href={`/users/${u.id}`}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Chi tiết
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pendingConfirm ? (
        <ConfirmDialog
          open
          title={
            pendingConfirm.type === "disable"
              ? "Vô hiệu hóa tài khoản?"
              : pendingConfirm.type === "reset"
                ? "Reset mật khẩu?"
                : "Kích hoạt lại tài khoản?"
          }
          description={
            pendingConfirm.type === "disable"
              ? `Tài khoản ${pendingConfirm.user.email} sẽ không đăng nhập được và phiên hiện tại bị thu hồi ngay.`
              : pendingConfirm.type === "reset"
                ? `Tài khoản ${pendingConfirm.user.email} sẽ bị đăng xuất ngay và phải đặt mật khẩu mới ở bước đăng nhập.`
                : `Tài khoản ${pendingConfirm.user.email} sẽ được phép đăng nhập lại.`
          }
          confirmLabel={
            pendingConfirm.type === "disable"
              ? "Vô hiệu hóa"
              : pendingConfirm.type === "reset"
                ? "Reset mật khẩu"
                : "Kích hoạt"
          }
          variant={pendingConfirm.type === "enable" ? "primary" : "danger"}
          pending={actionPending}
          onCancel={() => {
            if (!actionPending) setPendingConfirm(null);
          }}
          onConfirm={() => runConfirm()}
        />
      ) : null}
    </div>
  );
}
