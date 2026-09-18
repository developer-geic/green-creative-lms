"use client";

import { Be_Vietnam_Pro } from "next/font/google";
import { useEffect } from "react";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="vi">
      <body className={`${beVietnam.variable} font-sans antialiased`}>
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface p-8 text-center shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-2xl font-bold text-primary-dark">
              500
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              Mã lỗi 500
            </p>
            <h1 className="mt-1 text-2xl font-bold text-foreground">Lỗi nghiêm trọng</h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              Ứng dụng gặp sự cố không khôi phục được layout. Vui lòng thử lại.
            </p>
            <button type="button" className="btn btn-primary mt-6" onClick={reset}>
              Thử lại
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
