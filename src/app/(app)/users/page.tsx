"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { lmsApi } from "@/lib/api";

export default function UsersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("teacher");

  function load() {
    lmsApi.users("?limit=100").then((res) => setItems(res.data || [])).catch((e) => toast.error(e.message));
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
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function approve(id: number) {
    try {
      await lmsApi.approveUser(id, "teacher");
      toast.success("Đã duyệt");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const pending = items.filter((u) => u.status === "pending");
  const others = items.filter((u) => u.status !== "pending");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-primary-dark">Quản lý người dùng</h1>

      <form onSubmit={create} className="card flex flex-wrap gap-3">
        <input className="input max-w-xs" required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input max-w-xs" placeholder="Họ tên" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="input max-w-[160px]" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="teacher">Giáo viên</option>
          <option value="admin">Admin</option>
        </select>
        <button className="btn btn-primary">Thêm tài khoản</button>
      </form>

      {pending.length > 0 && (
        <div className="card">
          <h2 className="mb-3 font-semibold">Chờ duyệt ({pending.length})</h2>
          {pending.map((u) => (
            <div key={u.id} className="flex items-center justify-between border-b border-border py-2 text-sm">
              <div>
                <div className="font-medium">{u.name || "—"}</div>
                <div className="text-xs text-slate-500">{u.email}</div>
              </div>
              <button className="btn btn-primary !py-1 text-xs" onClick={() => approve(u.id)}>Duyệt (GV)</button>
            </div>
          ))}
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-slate-500">
              <th className="py-2">Họ tên</th>
              <th>Email</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {others.map((u) => (
              <tr key={u.id} className="border-b border-border/70">
                <td className="py-2">
                  {u.role === "teacher" ? (
                    <Link className="font-medium text-primary-dark hover:underline" href={`/users/${u.id}`}>
                      {u.name || "—"}
                    </Link>
                  ) : (
                    <span className="font-medium">{u.name || "—"}</span>
                  )}
                </td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td><span className="pill pill-neutral">{u.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
