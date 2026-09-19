"use client";

import { useParams, notFound } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { AvatarEditor, pickAvatarPath } from "@/components/AvatarEditor";
import { CatalogPermissionEditor } from "@/components/catalogs/CatalogPermissionEditor";
import { lmsApi } from "@/lib/api";

export default function UserDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [missing, setMissing] = useState(false);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarSaving, startAvatarSave] = useTransition();

  function applyAvatarFromPayload(payload: any) {
    const path =
      pickAvatarPath(payload?.user) ||
      pickAvatarPath(payload?.teacher_profile) ||
      pickAvatarPath(payload) ||
      null;
    setAvatarPath(path);
  }

  function load() {
    lmsApi
      .userDetail(id)
      .then((res) => {
        setData(res.data);
        applyAvatarFromPayload(res.data);
      })
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

  function onAvatarPick(file: File) {
    startAvatarSave(async () => {
      try {
        const res = await lmsApi.uploadUserAvatar(id, file);
        const nextAvatar = pickAvatarPath(res.data) || pickAvatarPath(res);
        if (nextAvatar) setAvatarPath(nextAvatar);
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

  const displayName = data.user?.name || data.user?.email || "Người dùng";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <AvatarEditor
          path={avatarPath}
          name={displayName}
          saving={avatarSaving}
          onPick={onAvatarPick}
          size="md"
          hint="JPEG / PNG / WebP, tối đa 2MB"
        />
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">{displayName}</h1>
          <p className="text-sm text-on-surface-variant">{data.user?.email}</p>
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
