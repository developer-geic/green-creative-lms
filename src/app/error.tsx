"use client";

import { useEffect } from "react";
import { ErrorStatusView } from "@/components/ErrorStatusView";

export default function Error({
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
    <ErrorStatusView
      code={500}
      title="Đã xảy ra lỗi hệ thống"
      description="Không thể hiển thị trang này. Thử lại hoặc quay về tổng quan. Nếu lỗi tiếp tục, liên hệ quản trị viên."
      primaryLabel="Thử lại"
      onPrimaryClick={reset}
      secondaryHref="/dashboard"
      secondaryLabel="Về tổng quan"
    />
  );
}
