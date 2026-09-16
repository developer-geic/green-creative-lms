"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { lmsApi } from "@/lib/api";

export default function ProfilePage() {
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  function load() {
    lmsApi
      .teacherProfile()
      .then((res) => {
        setData(res.data);
        setForm(res.data.profile || {});
      })
      .catch((e) => toast.error(e.message));
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await lmsApi.updateTeacherProfile({
        full_name: form.full_name,
        phone: form.phone,
        dob: form.dob,
        address: form.address,
        bio: form.bio,
        certificate: form.certificate,
        experience: form.experience,
      });
      toast.success(
        res.data?.mode === "approval"
          ? "Đã gửi yêu cầu chờ admin duyệt"
          : "Đã cập nhật hồ sơ",
      );
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (!data) return <div>Đang tải...</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-primary-dark">Hồ sơ cá nhân</h1>
      <div className="card text-sm text-slate-600">
        {data.direct_edit_available
          ? "Bạn còn 1 lần sửa tự do. Từ lần sau (trừ ảnh đại diện) cần admin duyệt."
          : "Các thay đổi hồ sơ sẽ gửi admin duyệt. Ảnh đại diện vẫn sửa được ngay."}
      </div>
      {data.pending_request && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Đang có yêu cầu chờ duyệt.
        </div>
      )}
      <form onSubmit={save} className="card grid gap-3 md:grid-cols-2">
        {["full_name", "phone", "dob", "address", "certificate"].map((f) => (
          <input
            key={f}
            className="input"
            type={f === "dob" ? "date" : "text"}
            placeholder={f}
            value={form[f] || ""}
            onChange={(e) => setForm({ ...form, [f]: e.target.value })}
          />
        ))}
        <textarea className="input md:col-span-2" placeholder="Bio" value={form.bio || ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        <textarea className="input md:col-span-2" placeholder="Kinh nghiệm" value={form.experience || ""} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
        <button className="btn btn-primary md:col-span-2">Lưu hồ sơ</button>
      </form>
    </div>
  );
}
