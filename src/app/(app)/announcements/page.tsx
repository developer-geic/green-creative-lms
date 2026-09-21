"use client";

import { FormEvent, Suspense, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bell, PenLine, XCircle } from "lucide-react";
import { toast } from "sonner";
import { lmsApi } from "@/lib/api";
import { buildQuery, cn } from "@/lib/utils";

const POLL_MS = 120_000;

type AnnouncementItem = {
  id: number;
  title: string;
  body: string;
  status: string;
  author?: { id?: number; name?: string | null; email?: string | null } | null;
  is_read?: boolean;
  can_recall?: boolean;
  created_at?: string | null;
  recalled_at?: string | null;
};

type ReadFilter = "" | "unread" | "read";

const FILTERS: Array<{ value: ReadFilter; label: string }> = [
  { value: "", label: "Tất cả" },
  { value: "unread", label: "Chưa đọc" },
  { value: "read", label: "Đã đọc" },
];

function authorInitial(author?: AnnouncementItem["author"]) {
  const name = (author?.name || author?.email || "?").trim();
  return name.slice(0, 1).toUpperCase() || "?";
}

function authorLabel(author?: AnnouncementItem["author"]) {
  return author?.name || author?.email || "Người dùng";
}

function ComposeModal({
  open,
  pending,
  title,
  body,
  onTitle,
  onBody,
  onClose,
  onSubmit,
}: {
  open: boolean;
  pending: boolean;
  title: string;
  body: string;
  onTitle: (v: string) => void;
  onBody: (v: string) => void;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#213145]/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={onSubmit}
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-surface shadow-xl"
      >
        <div className="flex items-center justify-between bg-surface-low px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <PenLine className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Viết thông báo</h3>
              <p className="text-xs text-on-surface-variant">Đăng cho toàn bộ người dùng LMS</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-high"
            onClick={onClose}
            aria-label="Đóng"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">
              Tiêu đề <span className="text-danger">*</span>
            </label>
            <input
              className="input"
              required
              value={title}
              onChange={(e) => onTitle(e.target.value)}
              placeholder="Tiêu đề thông báo"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">
              Nội dung <span className="text-danger">*</span>
            </label>
            <textarea
              className="input min-h-[140px] py-2"
              required
              rows={5}
              value={body}
              onChange={(e) => onBody(e.target.value)}
              placeholder="Nội dung thông báo..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-surface-low px-6 py-4">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={pending}>
            Hủy
          </button>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Đang đăng..." : "Đăng"}
          </button>
        </div>
      </form>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="card space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-surface-high" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 animate-pulse rounded bg-surface-high" />
              <div className="h-3 w-28 animate-pulse rounded bg-surface-high" />
            </div>
          </div>
          <div className="h-4 w-3/4 max-w-[75%] animate-pulse rounded bg-surface-high" />
          <div className="h-16 animate-pulse rounded-lg bg-surface-low" />
        </div>
      ))}
    </div>
  );
}

function AnnouncementsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const userName =
    (session?.user as { name?: string } | undefined)?.name ||
    (session?.user as { email?: string } | undefined)?.email ||
    "Bạn";

  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [readStatus, setReadStatus] = useState<ReadFilter>(
    (searchParams.get("read_status") as ReadFilter) || "",
  );
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function fetchFeed(opts?: { syncUrl?: boolean }) {
    const syncUrl = opts?.syncUrl ?? false;
    const query = buildQuery({ read_status: readStatus || undefined });
    if (syncUrl) {
      router.replace(`/announcements${query}`);
    }
    return Promise.all([
      lmsApi.announcements(query),
      lmsApi.unreadCount().catch(() => ({ data: { count: 0 } })),
    ])
      .then(([listRes, unreadRes]) => {
        setItems(listRes.data || []);
        setUnread(unreadRes.data?.count || 0);
      })
      .catch((e) => toast.error(e.message || "Không tải được thông báo"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setLoading(true);
    void fetchFeed({ syncUrl: true });
    const id = window.setInterval(() => {
      void fetchFeed({ syncUrl: false });
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [readStatus]);

  function openModal() {
    setTitle("");
    setBody("");
    setModalOpen(true);
  }

  function closeModal() {
    if (pending) return;
    setModalOpen(false);
    setTitle("");
    setBody("");
  }

  function create(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await lmsApi.createAnnouncement({ title: title.trim(), body: body.trim() });
        toast.success("Đã đăng thông báo");
        setModalOpen(false);
        setTitle("");
        setBody("");
        setLoading(true);
        await fetchFeed({ syncUrl: false });
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Không đăng được thông báo");
      }
    });
  }

  async function markRead(id: number) {
    try {
      await lmsApi.markAnnouncementRead(id);
      await fetchFeed({ syncUrl: false });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Không đánh dấu được");
    }
  }

  async function recall(id: number) {
    try {
      await lmsApi.recallAnnouncement(id);
      toast.success("Đã thu hồi");
      await fetchFeed({ syncUrl: false });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Không thu hồi được");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">Thông báo</h1>
          <p className="text-sm text-on-surface-variant">Bảng tin nội bộ LMS</p>
        </div>
        {unread > 0 ? (
          <span className="rounded-full bg-danger px-2.5 py-0.5 text-xs font-bold text-white">
            {unread} chưa đọc
          </span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={openModal}
        className="card flex w-full items-center gap-3 text-left transition-colors hover:bg-surface-low/40"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-dark">
          {userName.trim().slice(0, 1).toUpperCase()}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold text-foreground">{userName}</span>
          <span className="text-sm text-on-surface-variant">Viết thông báo...</span>
        </div>
        <span className="btn btn-primary !py-1.5 text-xs">
          <PenLine className="h-3.5 w-3.5" />
          Viết thông báo
        </span>
      </button>

      <div className="flex gap-1 rounded-xl bg-surface-low p-1">
        {FILTERS.map((f) => {
          const active = readStatus === f.value;
          return (
            <button
              key={f.value || "all"}
              type="button"
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                active
                  ? "bg-surface text-primary shadow-sm"
                  : "text-on-surface-variant hover:text-foreground",
              )}
              onClick={() => setReadStatus(f.value)}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <FeedSkeleton />
      ) : items.length > 0 ? (
        <div className="space-y-3">
          {items.map((a) => {
            const recalled = a.status === "recalled";
            const unreadItem = !a.is_read && !recalled;
            return (
              <article
                key={a.id}
                className={cn(
                  "card space-y-3 !p-4",
                  unreadItem ? "bg-primary/[0.04] ring-1 ring-primary/15" : null,
                  recalled ? "opacity-90" : null,
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-low text-sm font-bold text-primary">
                      {authorInitial(a.author)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-semibold text-foreground">
                          {authorLabel(a.author)}
                        </span>
                        {unreadItem ? (
                          <span className="pill pill-good">Chưa đọc</span>
                        ) : null}
                        {recalled ? (
                          <span className="pill pill-warn">Đã thu hồi</span>
                        ) : null}
                      </div>
                      <p className="text-xs text-on-surface-variant">{a.created_at || "—"}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                    {unreadItem ? (
                      <button
                        type="button"
                        className="btn btn-ghost !py-1 text-xs"
                        onClick={() => markRead(a.id)}
                      >
                        Đánh dấu đã đọc
                      </button>
                    ) : null}
                    {a.can_recall ? (
                      <button
                        type="button"
                        className="btn btn-danger !py-1 text-xs"
                        onClick={() => recall(a.id)}
                      >
                        Thu hồi
                      </button>
                    ) : null}
                  </div>
                </div>

                <div>
                  <h3
                    className={cn(
                      "text-base font-semibold text-foreground",
                      recalled ? "text-on-surface-variant" : null,
                    )}
                  >
                    {a.title}
                  </h3>
                  <p
                    className={cn(
                      "mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground",
                      recalled ? "text-on-surface-variant" : null,
                    )}
                  >
                    {a.body}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card flex flex-col items-center gap-2 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-low text-primary">
            <Bell className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-foreground">Chưa có thông báo.</p>
          <p className="text-xs text-on-surface-variant">
            Bấm Viết để đăng thông báo đầu tiên.
          </p>
        </div>
      )}

      <ComposeModal
        open={modalOpen}
        pending={pending}
        title={title}
        body={body}
        onTitle={setTitle}
        onBody={setBody}
        onClose={closeModal}
        onSubmit={create}
      />
    </div>
  );
}

export default function AnnouncementsPage() {
  return (
    <Suspense fallback={<div>Đang tải...</div>}>
      <AnnouncementsContent />
    </Suspense>
  );
}
