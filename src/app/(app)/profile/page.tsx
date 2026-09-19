"use client";

import { FormEvent, useEffect, useRef, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import {
  Camera,
  History,
  Mail,
  Phone,
  Save,
  Shield,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { lmsApi } from "@/lib/api";
import { avatarSrc } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import type { LmsUser } from "@/types/lms";

type ProfileForm = {
  full_name: string;
  phone: string;
  dob: string;
  address: string;
  bio: string;
  certificate: string;
  experience: string;
};

type TabId = "pedagogy" | "security" | "requests";

const EMPTY_FORM: ProfileForm = {
  full_name: "",
  phone: "",
  dob: "",
  address: "",
  bio: "",
  certificate: "",
  experience: "",
};

const FIELD_LABELS: Record<string, string> = {
  full_name: "Họ và tên",
  phone: "Số điện thoại",
  dob: "Ngày sinh",
  address: "Địa chỉ",
  bio: "Tiểu sử",
  certificate: "Chứng chỉ",
  experience: "Kinh nghiệm",
};

function formatDob(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return "";
}

function profileToForm(profile: Record<string, unknown> | null | undefined): ProfileForm {
  if (!profile) return { ...EMPTY_FORM };
  return {
    full_name: String(profile.full_name || ""),
    phone: String(profile.phone || ""),
    dob: formatDob(profile.dob),
    address: String(profile.address || ""),
    bio: String(profile.bio || ""),
    certificate: String(profile.certificate || ""),
    experience: String(profile.experience || ""),
  };
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<TabId>("pedagogy");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<LmsUser | null>(null);
  const [directEditAvailable, setDirectEditAvailable] = useState(true);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [baseline, setBaseline] = useState<ProfileForm>(EMPTY_FORM);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [pw, setPw] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [saving, startSave] = useTransition();
  const [pwSaving, startPwSave] = useTransition();
  const [avatarSaving, startAvatarSave] = useTransition();

  function load() {
    setLoading(true);
    Promise.all([lmsApi.me(), lmsApi.teacherProfile()])
      .then(([meRes, profileRes]) => {
        const u = meRes.data?.user || meRes.data;
        setUser(u || null);
        const profile = profileRes.data?.profile;
        const nextForm = profileToForm(profile);
        setForm(nextForm);
        setBaseline(nextForm);
        setDirectEditAvailable(!!profileRes.data?.direct_edit_available);
        setPendingRequest(profileRes.data?.pending_request || null);
        setAvatarPath(profile?.avatar || u?.avatar || null);
      })
      .catch((e) => toast.error(e.message || "Không tải được hồ sơ"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setForm(baseline);
  }

  function patchForm(patch: Partial<ProfileForm>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function saveProfile(e?: FormEvent) {
    e?.preventDefault();
    startSave(async () => {
      try {
        const res = await lmsApi.updateTeacherProfile({
          full_name: form.full_name || null,
          phone: form.phone || null,
          dob: form.dob || null,
          address: form.address || null,
          bio: form.bio || null,
          certificate: form.certificate || null,
          experience: form.experience || null,
        });
        const mode = res.data?.mode;
        toast.success(
          mode === "approval"
            ? "Đã gửi yêu cầu chờ admin duyệt"
            : "Đã cập nhật hồ sơ",
        );
        load();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : (err as any)?.message || "Lỗi lưu hồ sơ");
      }
    });
  }

  function onAvatarPick(file?: File | null) {
    if (!file) return;
    startAvatarSave(async () => {
      try {
        const res = await lmsApi.uploadAvatar(file);
        const nextAvatar = res.data?.avatar || res.data?.user?.avatar;
        if (nextAvatar) setAvatarPath(nextAvatar);
        toast.success("Đã cập nhật ảnh đại diện");
        await updateSession?.();
        load();
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : (err as any)?.message || "Lỗi tải ảnh",
        );
      }
    });
  }

  function savePassword(e: FormEvent) {
    e.preventDefault();
    if (pw.password !== pw.password_confirmation) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    startPwSave(async () => {
      try {
        await lmsApi.changePassword(pw);
        toast.success("Đã đổi mật khẩu");
        setPw({ current_password: "", password: "", password_confirmation: "" });
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : (err as any)?.message || "Lỗi đổi mật khẩu",
        );
      }
    });
  }

  const displayName =
    form.full_name ||
    user?.name ||
    (session?.user as { name?: string } | undefined)?.name ||
    "Giáo viên";
  const email =
    user?.email || (session?.user as { email?: string } | undefined)?.email || "";
  const role = user?.role;
  const avatar = avatarSrc(avatarPath);
  const pendingCount = pendingRequest ? 1 : 0;

  const tabs: Array<{ id: TabId; label: string; icon: typeof UserRound; badge?: number }> = [
    { id: "pedagogy", label: "Thông tin cá nhân", icon: UserRound },
    { id: "security", label: "Bảo mật & Mật khẩu", icon: Shield },
    { id: "requests", label: "Yêu cầu thay đổi", icon: History, badge: pendingCount },
  ];

  if (loading) {
    return (
      <div className="flex w-full flex-col gap-6">
        <div className="h-10 w-72 animate-pulse rounded-lg bg-surface-low" />
        <div className="h-28 animate-pulse rounded-xl bg-surface-low" />
        <div className="h-48 animate-pulse rounded-xl bg-surface-low" />
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="h-80 animate-pulse rounded-xl bg-surface-low xl:col-span-7" />
          <div className="h-80 animate-pulse rounded-xl bg-surface-low xl:col-span-5" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6 pb-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Hồ sơ cá nhân & Cài đặt tài khoản
          </h1>
          <p className="text-sm text-on-surface-variant">
            Quản lý hồ sơ giảng viên, quyền danh mục và thông tin xác thực LMS Sáng Tạo Xanh.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button type="button" className="btn btn-ghost" onClick={resetForm} disabled={saving}>
            Hủy bỏ
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={() => saveProfile()}
          >
            <Save className="h-4 w-4" />
            {saving
              ? "Đang lưu..."
              : directEditAvailable
                ? "Lưu thay đổi"
                : "Lưu / Gửi duyệt"}
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl bg-surface p-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="absolute bottom-0 left-0 top-0 w-1.5 bg-primary" />
        <div className="flex flex-col gap-3 pl-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-low text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold text-foreground">
                  Cơ chế phê duyệt hồ sơ giảng viên
                </span>
                <span className="rounded bg-surface-low px-2 py-0.5 text-[11px] font-bold text-primary">
                  {directEditAvailable ? "Lần cập nhật: miễn phí" : "Cần Admin duyệt"}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                {directEditAvailable
                  ? "Bạn còn 1 lần sửa hồ sơ trực tiếp. Từ lần sau, thay đổi họ tên, liên hệ, chứng chỉ và tiểu sử sẽ tạo yêu cầu chờ Admin duyệt."
                  : "Mọi thay đổi hồ sơ (trừ ảnh đại diện) sẽ gửi Admin duyệt trước khi áp dụng."}{" "}
                <span className="font-medium text-primary">
                  Ảnh đại diện áp dụng ngay, không cần xét duyệt.
                </span>
              </p>
            </div>
          </div>
          {pendingRequest ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-low px-3 py-1.5 text-[11px] font-semibold text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Đang có yêu cầu chờ duyệt
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-low px-3 py-1.5 text-[11px] font-semibold text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Hồ sơ đã chuẩn hóa
            </span>
          )}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl bg-surface p-6 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative group">
              <div className="h-28 w-28 overflow-hidden rounded-2xl bg-surface-low shadow-md sm:h-32 sm:w-32">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-primary">
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-on-primary shadow-md transition-transform hover:scale-105 disabled:opacity-60"
                title="Đổi ảnh đại diện"
                disabled={avatarSaving}
                onClick={() => fileRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                className="hidden"
                onChange={(e) => {
                  onAvatarPick(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-foreground sm:text-2xl">{displayName}</h2>
                {role ? (
                  <span className="rounded-md bg-primary-soft px-2.5 py-0.5 text-[11px] font-semibold text-primary-dark">
                    {role}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-on-surface-variant">
                {email ? (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-4 w-4 text-primary" />
                    {email}
                  </span>
                ) : null}
                {form.phone ? (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-4 w-4 text-primary" />
                    {form.phone}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-6 flex items-center gap-4 overflow-x-auto border-t border-surface-low pt-3">
          {tabs.map(({ id, label, icon: Icon, badge }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                className={cn(
                  "relative flex shrink-0 items-center gap-1.5 pb-2 text-sm font-semibold transition-colors",
                  active ? "text-primary" : "text-on-surface-variant hover:text-foreground",
                )}
                onClick={() => setTab(id)}
              >
                <Icon className="h-4 w-4" />
                {label}
                {badge ? (
                  <span className="rounded bg-surface-low px-1.5 py-0.5 text-[11px] text-primary">
                    {badge}
                  </span>
                ) : null}
                {active ? (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "pedagogy" ? (
        <form
          onSubmit={saveProfile}
          className="flex max-w-3xl flex-col gap-6 rounded-xl bg-surface p-6 shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              <h3 className="text-lg font-semibold text-foreground">
                Thông tin định danh & Liên hệ
              </h3>
            </div>
            <span className="rounded bg-surface-low px-2 py-1 text-[11px] text-on-surface-variant">
              {directEditAvailable ? "Sửa trực tiếp lần này" : "Thay đổi cần Admin duyệt"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Họ và tên" required>
              <input
                className="input"
                value={form.full_name}
                onChange={(e) => patchForm({ full_name: e.target.value })}
              />
            </Field>
            <Field label="Số điện thoại" required>
              <input
                className="input"
                type="tel"
                value={form.phone}
                onChange={(e) => patchForm({ phone: e.target.value })}
              />
            </Field>
            <Field label="Ngày sinh">
              <input
                className="input"
                type="date"
                value={form.dob}
                onChange={(e) => patchForm({ dob: e.target.value })}
              />
            </Field>
            <Field label="Email công vụ LMS">
              <input className="input cursor-not-allowed opacity-70" value={email} readOnly />
              <p className="text-[11px] text-on-surface-variant">
                Email do tổ chức cấp, không đổi tại đây.
              </p>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Địa chỉ">
                <input
                  className="input"
                  value={form.address}
                  onChange={(e) => patchForm({ address: e.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Chứng chỉ / bằng cấp">
                <input
                  className="input"
                  value={form.certificate}
                  onChange={(e) => patchForm({ certificate: e.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Kinh nghiệm">
                <textarea
                  className="input min-h-[88px] py-2"
                  value={form.experience}
                  onChange={(e) => patchForm({ experience: e.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Tiểu sử sư phạm">
                <textarea
                  className="input min-h-[112px] py-2"
                  value={form.bio}
                  onChange={(e) => patchForm({ bio: e.target.value })}
                />
              </Field>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Đang lưu..." : "Lưu hồ sơ"}
            </button>
          </div>
        </form>
      ) : null}

      {tab === "security" ? (
        <form
          onSubmit={savePassword}
          className="flex max-w-xl flex-col gap-4 rounded-xl bg-surface p-6 shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
        >
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            <h3 className="text-lg font-semibold text-foreground">Đổi mật khẩu</h3>
          </div>
          <Field label="Mật khẩu hiện tại">
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={pw.current_password}
              onChange={(e) => setPw({ ...pw, current_password: e.target.value })}
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mật khẩu mới">
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                value={pw.password}
                onChange={(e) => setPw({ ...pw, password: e.target.value })}
                required
                minLength={4}
              />
            </Field>
            <Field label="Xác nhận mật khẩu">
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                value={pw.password_confirmation}
                onChange={(e) => setPw({ ...pw, password_confirmation: e.target.value })}
                required
                minLength={4}
              />
            </Field>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary" disabled={pwSaving}>
              {pwSaving ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
            </button>
          </div>
        </form>
      ) : null}

      {tab === "requests" ? (
        <div className="rounded-xl bg-surface p-6 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            <h3 className="text-lg font-semibold text-foreground">Yêu cầu thay đổi hồ sơ</h3>
          </div>
          {pendingRequest ? (
            <div className="space-y-3 rounded-lg bg-surface-low/60 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-semibold text-primary-dark">
                  Đang chờ duyệt
                </span>
                {pendingRequest.id ? (
                  <span className="text-xs text-on-surface-variant">#{pendingRequest.id}</span>
                ) : null}
              </div>
              <ul className="space-y-2 text-sm">
                {Object.entries(pendingRequest.payload || {}).map(([field, diff]: [string, any]) => (
                  <li
                    key={field}
                    className="flex flex-col gap-0.5 rounded-lg bg-surface px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="font-semibold text-foreground">
                      {FIELD_LABELS[field] || field}
                    </span>
                    <span className="text-on-surface-variant">
                      <span className="line-through opacity-60">{String(diff?.old ?? "—")}</span>
                      {" → "}
                      <span className="font-medium text-primary">{String(diff?.new ?? "—")}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-lg bg-surface-low/50 px-4 py-8 text-center text-sm text-on-surface-variant">
              Không có yêu cầu thay đổi đang chờ duyệt.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-foreground">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {children}
    </div>
  );
}
