"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";
import { AvatarEditor, pickAvatarPath } from "@/components/AvatarEditor";
import { CatalogPermissionEditor } from "@/components/catalogs/CatalogPermissionEditor";
import { ErrorStatusView } from "@/components/ErrorStatusView";
import { lmsApi } from "@/lib/api";
import type {
  CatalogPermissions,
  TeacherProfile,
  UserDetailPayload,
} from "@/types/lms";
import {
  PROFILE_FIELD_KEYS,
  PROFILE_FIELD_LABELS,
  classRoleLabel,
  classStatusLabel,
  classStatusPillClass,
  displayValue,
  formatDob,
  parsePayloadDiff,
  requestStatusLabel,
  requestStatusPillClass,
  roleLabel,
  userStatusLabel,
  userStatusPillClass,
} from "./user-detail-fields";

function profileFieldValue(profile: TeacherProfile, key: string): string {
  if (key === "dob") return displayValue(formatDob(profile.dob) || null);
  const raw = profile[key as keyof TeacherProfile];
  return displayValue(raw == null ? null : String(raw));
}

function UserDetailSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="space-y-2">
        <div className="h-3 w-48 animate-pulse rounded bg-surface-high" />
        <div className="h-8 w-72 animate-pulse rounded bg-surface-high" />
      </div>
      <div className="card flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="h-20 w-20 animate-pulse rounded-2xl bg-surface-high" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-6 w-48 animate-pulse rounded bg-surface-high" />
          <div className="h-4 w-56 animate-pulse rounded bg-surface-high" />
          <div className="flex gap-2">
            <div className="h-5 w-20 animate-pulse rounded-full bg-surface-high" />
            <div className="h-5 w-20 animate-pulse rounded-full bg-surface-high" />
          </div>
        </div>
      </div>
      <div className="card space-y-3">
        <div className="h-5 w-40 animate-pulse rounded bg-surface-high" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-low" />
          ))}
        </div>
      </div>
      <div className="card space-y-3">
        <div className="h-5 w-36 animate-pulse rounded bg-surface-high" />
        <div className="h-24 animate-pulse rounded-lg bg-surface-low" />
      </div>
    </div>
  );
}

export default function UserDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<UserDetailPayload | null>(null);
  const [missing, setMissing] = useState(false);
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null);
  const [avatarSaving, startAvatarSave] = useTransition();
  const [reviewingId, setReviewingId] = useState<number | null>(null);

  function load() {
    setMissing(false);
    lmsApi
      .userDetail(id)
      .then((res) => {
        setData(res.data as UserDetailPayload);
        setAvatarOverride(null);
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
    setData(null);
    load();
  }, [id]);

  async function review(requestId: number, action: "approve" | "reject") {
    setReviewingId(requestId);
    try {
      await lmsApi.reviewProfileRequest(requestId, action);
      toast.success(action === "approve" ? "Đã duyệt" : "Đã từ chối");
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không duyệt được yêu cầu");
    } finally {
      setReviewingId(null);
    }
  }

  function onAvatarPick(file: File) {
    startAvatarSave(async () => {
      try {
        const res = await lmsApi.uploadUserAvatar(id, file);
        const nextAvatar = pickAvatarPath(res.data) || pickAvatarPath(res);
        if (nextAvatar) setAvatarOverride(nextAvatar);
        toast.success("Đã cập nhật ảnh đại diện");
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            user: {
              ...prev.user,
              avatar: nextAvatar ?? prev.user?.avatar,
            },
            teacher_profile: prev.teacher_profile
              ? {
                  ...prev.teacher_profile,
                  avatar: nextAvatar ?? prev.teacher_profile.avatar,
                }
              : prev.teacher_profile,
          };
        });
        load();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Lỗi tải ảnh");
      }
    });
  }

  if (missing) {
    return (
      <ErrorStatusView
        code={404}
        title="Không tìm thấy người dùng"
        description="Tài khoản này không tồn tại hoặc đã bị xóa."
        primaryHref="/users"
        primaryLabel="Quay lại danh sách"
      />
    );
  }

  if (!data) return <UserDetailSkeleton />;

  const user = data.user;
  const profile = data.teacher_profile ?? null;
  const classes = data.classes || [];
  const changeRequests = data.change_requests || [];
  const displayName = user?.name || user?.email || "Người dùng";
  const avatarPath =
    avatarOverride ||
    pickAvatarPath(user) ||
    pickAvatarPath(profile) ||
    null;
  const isTeacher = user?.role === "teacher";

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
            Phân quyền & Kiểm soát truy cập
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{displayName}</h1>
        </div>
        <Link
          href="/users"
          className="btn btn-ghost inline-flex w-fit items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Danh sách người dùng
        </Link>
      </div>

      <div className="card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <AvatarEditor
            path={avatarPath}
            name={displayName}
            saving={avatarSaving}
            onPick={onAvatarPick}
            size="md"
            hint="JPEG / PNG / WebP, tối đa 2MB"
          />
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
              <span className="pill pill-good">{roleLabel(user?.role)}</span>
              <span className={userStatusPillClass(user?.status)}>
                {userStatusLabel(user?.status)}
              </span>
            </div>
            {user?.email ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant">
                <Mail className="h-4 w-4 text-primary" />
                {user.email}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
          <h2 className="text-lg font-semibold text-foreground">Hồ sơ giáo viên</h2>
        </div>
        {profile ? (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {PROFILE_FIELD_KEYS.map((key) => {
              const long = key === "bio" || key === "experience";
              return (
                <div key={key} className={long ? "sm:col-span-2" : undefined}>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    {PROFILE_FIELD_LABELS[key]}
                  </dt>
                  <dd
                    className={
                      long
                        ? "mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground"
                        : "mt-1 text-sm font-medium text-foreground"
                    }
                  >
                    {profileFieldValue(profile, key)}
                  </dd>
                </div>
              );
            })}
          </dl>
        ) : (
          <p className="rounded-lg bg-surface-low/50 px-4 py-8 text-center text-sm text-on-surface-variant">
            Chưa có hồ sơ giáo viên
          </p>
        )}
      </div>

      {isTeacher ? (
        <CatalogPermissionEditor
          userId={id}
          initial={data.catalog_permissions || user?.catalog_permissions}
          onSaved={(flags: CatalogPermissions) =>
            setData((prev) =>
              prev
                ? {
                    ...prev,
                    catalog_permissions: flags,
                    user: { ...prev.user, catalog_permissions: flags },
                  }
                : prev,
            )
          }
        />
      ) : null}

      <div className="overflow-hidden rounded-xl bg-surface shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="border-b border-surface-low px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            <h2 className="text-lg font-semibold text-foreground">Lớp đang phụ trách</h2>
          </div>
        </div>
        {classes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-low text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  <th className="px-4 py-3">Mã lớp</th>
                  <th className="px-4 py-3">Chương trình / Khóa</th>
                  <th className="px-4 py-3">Vai trò</th>
                  <th className="px-4 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-low/60">
                {classes.map((c, idx) => (
                  <tr
                    key={`${c.id ?? "x"}-${c.role ?? ""}-${idx}`}
                    className="transition-colors hover:bg-surface-low/50"
                  >
                    <td className="px-4 py-3 font-semibold">
                      {c.id ? (
                        <Link
                          href={`/classes/${c.id}`}
                          className="text-primary hover:underline"
                        >
                          {c.code || `Lớp #${c.id}`}
                        </Link>
                      ) : (
                        <span>{c.code || "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {c.course || c.program || "—"}
                    </td>
                    <td className="px-4 py-3">{classRoleLabel(c.role)}</td>
                    <td className="px-4 py-3">
                      <span className={classStatusPillClass(c.status)}>
                        {classStatusLabel(c.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-on-surface-variant">Chưa có lớp.</p>
        )}
      </div>

      <div className="card">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
          <h2 className="text-lg font-semibold text-foreground">Yêu cầu thay đổi hồ sơ</h2>
        </div>
        {changeRequests.length > 0 ? (
          <div className="space-y-3">
            {changeRequests.map((r) => {
              const entries = Object.entries(r.payload || {});
              const busy = reviewingId === r.id;
              return (
                <div
                  key={r.id}
                  className="space-y-3 rounded-lg bg-surface-low/60 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={requestStatusPillClass(r.status)}>
                        {requestStatusLabel(r.status)}
                      </span>
                      <span className="text-xs text-on-surface-variant">#{r.id}</span>
                    </div>
                    {r.created_at ? (
                      <span className="text-xs text-on-surface-variant">{r.created_at}</span>
                    ) : null}
                  </div>
                  {entries.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {entries.map(([field, raw]) => {
                        const diff = parsePayloadDiff(raw);
                        return (
                          <li
                            key={field}
                            className="flex flex-col gap-0.5 rounded-lg bg-surface px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <span className="font-semibold text-foreground">
                              {PROFILE_FIELD_LABELS[field] || field}
                            </span>
                            <span className="text-on-surface-variant">
                              <span className="line-through opacity-60">
                                {displayValue(diff.old)}
                              </span>
                              {" → "}
                              <span className="font-medium text-primary">
                                {displayValue(diff.new)}
                              </span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-on-surface-variant">Không có thay đổi chi tiết.</p>
                  )}
                  {r.review_note ? (
                    <p className="text-xs text-on-surface-variant">
                      Ghi chú duyệt:{" "}
                      <span className="font-medium text-foreground">{r.review_note}</span>
                    </p>
                  ) : null}
                  {r.status === "pending" ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-primary !py-1.5 text-xs"
                        disabled={busy}
                        onClick={() => review(r.id, "approve")}
                      >
                        {busy ? "Đang xử lý..." : "Duyệt"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger !py-1.5 text-xs"
                        disabled={busy}
                        onClick={() => review(r.id, "reject")}
                      >
                        Từ chối
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-lg bg-surface-low/50 px-4 py-8 text-center text-sm text-on-surface-variant">
            Không có yêu cầu.
          </p>
        )}
      </div>
    </div>
  );
}
