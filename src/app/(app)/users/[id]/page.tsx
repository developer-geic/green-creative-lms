"use client";

import { useParams, notFound } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, UserRound } from "lucide-react";
import { toast } from "sonner";
import { CatalogPermissionEditor } from "@/components/catalogs/CatalogPermissionEditor";
import { lmsApi } from "@/lib/api";
import { avatarSrc } from "@/lib/avatar";

export default function UserDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const fileRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<any>(null);
  const [missing, setMissing] = useState(false);
  const [avatarSaving, startAvatarSave] = useTransition();

  function load() {
    lmsApi
      .userDetail(id)
      .then((res) => setData(res.data))
      .catch((e) => {
        if (e?.statusCode === 404) {
          setMissing(true);
          return;
        }
        toast.error(e.message);
      });
  }

  useEffect(() => {
    load();
  }, [id]);

  async function review(requestId: number, action: "approve" | "reject") {
    try {
      await lmsApi.reviewProfileRequest(requestId, action);
      toast.success(action === "approve" ? "Đã duyệt" : "Đã từ chối");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function onAvatarPick(file?: File | null) {
    if (!file) return;
    startAvatarSave(async () => {
      try {
        const res = await lmsApi.uploadUserAvatar(id, file);
        const nextAvatar = res.data?.avatar || res.data?.user?.avatar;
        toast.success("Đã cập nhật ảnh đại diện");
        setData((prev: any) => ({
          ...prev,
          user: {
            ...prev?.user,
            avatar: nextAvatar ?? prev?.user?.avatar,
          },
          teacher_profile: prev?.teacher_profile
            ? { ...prev.teacher_profile, avatar: nextAvatar ?? prev.teacher_profile.avatar }
            : prev?.teacher_profile,
        }));
        load();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Lỗi tải ảnh");
      }
    });
  }

  if (missing) {
    notFound();
  }

  if (!data) return <div>Đang tải...</div>;

  const avatar = avatarSrc(data.user?.avatar || data.teacher_profile?.avatar);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-surface-low">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
              <UserRound className="h-8 w-8" />
            </div>
          )}
          <button
            type="button"
            className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-on-primary shadow disabled:opacity-60"
            title="Đổi ảnh đại diện"
            disabled={avatarSaving}
            onClick={() => fileRef.current?.click()}
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg"
            className="hidden"
            onChange={(e) => onAvatarPick(e.target.files?.[0])}
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">
            {data.user?.name || data.user?.email}
          </h1>
          <p className="text-xs text-on-surface-variant">
            JPEG / PNG / WebP, tối đa 2MB
            {avatarSaving ? " · Đang tải..." : ""}
          </p>
        </div>
      </div>

      <div className="card text-sm">
        <div>Email: {data.user?.email}</div>
        <div>Role: {data.user?.role}</div>
        <div>Status: {data.user?.status}</div>
      </div>

      {data.user?.role === "teacher" && (
        <CatalogPermissionEditor
          userId={id}
          initial={data.catalog_permissions || data.user?.catalog_permissions}
          onSaved={(flags) =>
            setData((prev: any) => ({
              ...prev,
              catalog_permissions: flags,
              user: { ...prev.user, catalog_permissions: flags },
            }))
          }
        />
      )}

      <div className="card">
        <h2 className="mb-2 font-semibold">Hồ sơ giáo viên</h2>
        <pre className="overflow-auto rounded bg-muted p-3 text-xs">
          {JSON.stringify(data.teacher_profile, null, 2)}
        </pre>
      </div>

      <div className="card">
        <h2 className="mb-2 font-semibold">Lớp đang phụ trách</h2>
        <div className="space-y-2">
          {(data.classes || []).map((c: any) => (
            <div
              key={`${c.id}-${c.role}`}
              className="flex justify-between border-b border-border py-2 text-sm"
            >
              <span>
                {c.code} — {c.course || c.program || "—"}
              </span>
              <span className="pill pill-neutral">
                {c.status} · {c.role}
              </span>
            </div>
          ))}
          {!data.classes?.length && <p className="text-sm text-slate-500">Chưa có lớp.</p>}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-2 font-semibold">Yêu cầu thay đổi hồ sơ</h2>
        {(data.change_requests || []).map((r: any) => (
          <div key={r.id} className="mb-3 rounded-lg border border-border p-3 text-sm">
            <div className="mb-1 flex justify-between">
              <span className="pill pill-neutral">{r.status}</span>
              <span className="text-xs text-slate-500">{r.created_at}</span>
            </div>
            <pre className="mb-2 overflow-auto rounded bg-muted p-2 text-xs">
              {JSON.stringify(r.payload, null, 2)}
            </pre>
            {r.status === "pending" && (
              <div className="flex gap-2">
                <button
                  className="btn btn-primary !py-1 text-xs"
                  onClick={() => review(r.id, "approve")}
                >
                  Duyệt
                </button>
                <button
                  className="btn btn-danger !py-1 text-xs"
                  onClick={() => review(r.id, "reject")}
                >
                  Từ chối
                </button>
              </div>
            )}
          </div>
        ))}
        {!data.change_requests?.length && (
          <p className="text-sm text-slate-500">Không có yêu cầu.</p>
        )}
      </div>
    </div>
  );
}
