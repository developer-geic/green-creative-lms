import { ErrorStatusView } from "@/components/ErrorStatusView";

export default function NotFound() {
  return (
    <ErrorStatusView
      code={404}
      title="Không tìm thấy trang"
      description="Đường dẫn không tồn tại hoặc tài nguyên đã bị xóa. Kiểm tra lại URL hoặc quay về tổng quan."
      primaryHref="/dashboard"
      primaryLabel="Về tổng quan"
      secondaryHref="/login"
      secondaryLabel="Đăng nhập"
    />
  );
}
