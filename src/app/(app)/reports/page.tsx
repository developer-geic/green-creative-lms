"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ReportsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.toString();
    router.replace(`/students${q ? `?${q}` : ""}`);
  }, [router, searchParams]);

  return (
    <div className="p-6 text-sm text-on-surface-variant">
      Đang chuyển sang Tra cứu học viên…
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-on-surface-variant">Đang tải…</div>}>
      <ReportsRedirect />
    </Suspense>
  );
}
