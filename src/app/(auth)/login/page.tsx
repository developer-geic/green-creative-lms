"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { lmsApi } from "@/lib/api";

type Step = "email" | "password" | "set-password" | "request" | "pending" | "disabled";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);

  async function continueEmail(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await lmsApi.lookup(email.trim());
      const data = res.data;
      if (!data.exists) {
        setStep("request");
      } else if (data.status === "pending") {
        setStep("pending");
      } else if (data.status === "disabled") {
        setStep("disabled");
      } else if (data.needs_password) {
        setName(data.name || "");
        setStep("set-password");
      } else {
        setName(data.name || "");
        setStep("password");
      }
    } catch (err: any) {
      toast.error(err.message || "Không kiểm tra được email");
    } finally {
      setLoading(false);
    }
  }

  async function doLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        toast.error(res.error);
        setLoading(false);
        return;
      }
      router.replace("/dashboard");
      // Keep loading until navigation completes
    } catch (err: any) {
      toast.error(err?.message || "Đăng nhập thất bại");
      setLoading(false);
    }
  }

  async function doSetPassword(e: FormEvent) {
    e.preventDefault();
    if (password !== password2) {
      toast.error("Mật khẩu nhập lại không khớp");
      return;
    }
    setLoading(true);
    try {
      await lmsApi.setPassword({
        email,
        password,
        password_confirmation: password2,
        name: name || undefined,
      });
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) throw new Error(res.error);
      router.replace("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Không đặt được mật khẩu");
      setLoading(false);
    }
  }

  async function doRequest(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await lmsApi.requestAccess({ email, name });
      setStep("pending");
      toast.success("Đã gửi yêu cầu truy cập");
    } catch (err: any) {
      toast.error(err.message || "Gửi yêu cầu thất bại");
    } finally {
      setLoading(false);
    }
  }

  function SubmitButton({ idle, busy }: { idle: string; busy: string }) {
    return (
      <button className="btn btn-primary w-full" disabled={loading}>
        {loading ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {busy}
          </span>
        ) : (
          idle
        )}
      </button>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-surface p-8 shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative space-y-4">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo.jpg"
            alt="Sáng Tạo Xanh"
            className="mb-3 h-12 w-12 rounded-xl object-contain"
          />
          <h1 className="text-xl font-bold text-foreground">Đăng nhập LMS</h1>
          <p className="text-sm text-on-surface-variant">Sáng Tạo Xanh · Enterprise LMS</p>
        </div>

        {step === "email" && (
          <form onSubmit={continueEmail} className="space-y-3">
            <label className="block text-xs font-semibold text-on-surface-variant">Email</label>
            <input
              className="input"
              type="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <SubmitButton idle="Tiếp tục" busy="Đang kiểm tra..." />
          </form>
        )}

        {step === "password" && (
          <form onSubmit={doLogin} className="space-y-3">
            <p className="text-sm text-on-surface-variant">{email}</p>
            <input
              className="input"
              type="password"
              required
              disabled={loading}
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <SubmitButton idle="Đăng nhập" busy="Đang đăng nhập..." />
            <button
              type="button"
              className="btn btn-ghost w-full"
              disabled={loading}
              onClick={() => setStep("email")}
            >
              Email khác
            </button>
          </form>
        )}

        {step === "set-password" && (
          <form onSubmit={doSetPassword} className="space-y-3">
            <p className="text-sm text-on-surface-variant">Thiết lập mật khẩu lần đầu cho {email}</p>
            <input
              className="input"
              disabled={loading}
              placeholder="Tên hiển thị"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="input"
              type="password"
              required
              minLength={4}
              disabled={loading}
              placeholder="Mật khẩu mới"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              className="input"
              type="password"
              required
              minLength={4}
              disabled={loading}
              placeholder="Nhập lại mật khẩu"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />
            <SubmitButton idle="Tạo mật khẩu & đăng nhập" busy="Đang tạo mật khẩu..." />
          </form>
        )}

        {step === "request" && (
          <form onSubmit={doRequest} className="space-y-3">
            <p className="text-sm text-on-surface-variant">{email} chưa có trong hệ thống. Gửi yêu cầu để admin duyệt.</p>
            <input
              className="input"
              required
              disabled={loading}
              placeholder="Họ tên"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <SubmitButton idle="Gửi yêu cầu" busy="Đang gửi..." />
            <button
              type="button"
              className="btn btn-ghost w-full"
              disabled={loading}
              onClick={() => setStep("email")}
            >
              Email khác
            </button>
          </form>
        )}

        {step === "pending" && (
          <div className="space-y-3">
            <p className="text-sm text-on-surface-variant">Yêu cầu đang chờ admin duyệt. Quay lại sau.</p>
            <button className="btn btn-ghost w-full" onClick={() => setStep("email")}>Email khác</button>
          </div>
        )}

        {step === "disabled" && (
          <div className="space-y-3">
            <p className="text-sm text-on-surface-variant">Tài khoản đã bị vô hiệu hoá. Liên hệ admin.</p>
            <button className="btn btn-ghost w-full" onClick={() => setStep("email")}>Email khác</button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
