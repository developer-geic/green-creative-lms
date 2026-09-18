import { ErrorStatusView } from "@/components/ErrorStatusView";

export default function ForbiddenPage() {
  return (
    <ErrorStatusView
      code={403}
      title="Không có quyền truy cập"
      description="Bạn đã đăng nhập nhưng không được cấp quyền thực hiện thao tác hoặc xem nội dung này. Liên hệ Admin nếu cần thêm quyền."
      primaryHref="/dashboard"
      primaryLabel="Về tổng quan"
      secondaryHref="/profile"
      secondaryLabel="Hồ sơ của tôi"
    />
  );
}
