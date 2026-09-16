"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { lmsApi } from "@/lib/api";
import { buildQuery } from "@/lib/utils";

function AnnouncementsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [readStatus, setReadStatus] = useState(searchParams.get("read_status") || "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [unread, setUnread] = useState(0);

  function load() {
    const query = buildQuery({ read_status: readStatus || undefined });
    router.replace(`/announcements${query}`);
    lmsApi.announcements(query).then((res) => setItems(res.data || [])).catch((e) => toast.error(e.message));
    lmsApi.unreadCount().then((res) => setUnread(res.data?.count || 0)).catch(() => {});
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await lmsApi.createAnnouncement({ title, body });
      setTitle("");
      setBody("");
      toast.success("Đã đăng thông báo");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function markRead(id: number) {
    await lmsApi.markAnnouncementRead(id);
    load();
  }

  async function recall(id: number) {
    try {
      await lmsApi.recallAnnouncement(id);
      toast.success("Đã thu hồi");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-dark">Thông báo</h1>
        {unread > 0 && <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-bold text-white">{unread} chưa đọc</span>}
      </div>

      <div className="card flex gap-3">
        <select className="input max-w-xs" value={readStatus} onChange={(e) => setReadStatus(e.target.value)}>
          <option value="">Tất cả</option>
          <option value="unread">Chưa đọc</option>
          <option value="read">Đã đọc</option>
        </select>
        <button className="btn btn-primary" onClick={load}>Lọc</button>
      </div>

      <form onSubmit={create} className="card space-y-3">
        <h2 className="font-semibold">Đăng thông báo</h2>
        <input className="input" required placeholder="Tiêu đề" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input" required rows={4} placeholder="Nội dung" value={body} onChange={(e) => setBody(e.target.value)} />
        <button className="btn btn-primary">Đăng</button>
      </form>

      <div className="space-y-3">
        {items.map((a) => (
          <div key={a.id} className="card space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{a.title}</h3>
                <p className="text-xs text-slate-500">
                  {a.author?.name || a.author?.email} · {a.created_at} · {a.is_read ? "Đã đọc" : "Chưa đọc"}
                </p>
              </div>
              <div className="flex gap-2">
                {!a.is_read && (
                  <button className="btn btn-ghost !py-1 text-xs" onClick={() => markRead(a.id)}>Đánh dấu đã đọc</button>
                )}
                {a.can_recall && (
                  <button className="btn btn-danger !py-1 text-xs" onClick={() => recall(a.id)}>Thu hồi</button>
                )}
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm">{a.body}</p>
            {a.status === "recalled" && <span className="pill pill-warn">Đã thu hồi</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnnouncementsPage() {
  return <Suspense fallback={<div>Đang tải...</div>}><AnnouncementsContent /></Suspense>;
}
