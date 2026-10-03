"use client";

import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { lmsApi, type ApiError } from "@/lib/api";

const TEMPLATE_HREF = "/templates/lms-import-mau.xlsx";
const TEMPLATE_NAME = "lms-import-mau.xlsx";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  function downloadTemplate() {
    const a = document.createElement("a");
    a.href = TEMPLATE_HREF;
    a.download = TEMPLATE_NAME;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("Đã tải file Excel mẫu");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast.error("Chọn file Excel");
    setLoading(true);
    try {
      const res = await lmsApi.importExcel(file);
      setResult(res.data);
      toast.success("Import thành công");
    } catch (err: unknown) {
      const apiErr = err as Partial<ApiError> | undefined;
      toast.error(
        typeof apiErr?.message === "string" && apiErr.message
          ? apiErr.message
          : err instanceof Error
            ? err.message
            : "Import thất bại",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-primary-dark">Import Excel</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Hỗ trợ file mẫu LMS hoặc workbook gốc <code>.xlsm</code> (Quản lý lớp học). Tải mẫu → điền /
          dùng file hiện có → nhập vào hệ thống.
        </p>
      </div>

      <div className="card space-y-3 text-sm text-slate-600">
        <p className="font-medium text-foreground">Quy trình</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Dùng <strong>file Excel mẫu</strong> bên dưới, hoặc upload trực tiếp workbook LMS gốc (
            <code>.xlsx</code> / <code>.xlsm</code>).
          </li>
          <li>
            Giữ nguyên tên sheet data: <code>01_CLASS</code>, <code>02_STUDENT</code>,{" "}
            <code>ATT_CONFIG</code>, <code>03_LOG_DIEMDANH</code>, <code>04_LOG_TIENDO</code>,{" "}
            <code>05_LOG_NHANXET</code>.
          </li>
          <li>
            Các sheet view (<code>03_ATTENDANCE</code>, <code>04_PROGRESS</code>,{" "}
            <code>05_ASSESSMENT</code>, <code>06_REPORT</code>) được bỏ qua — chỉ nhập từ sheet LOG.
          </li>
          <li>Chọn file rồi bấm <strong>Nhập dữ liệu</strong> (file lớn có thể mất vài phút).</li>
        </ol>
        <p className="text-xs text-on-surface-variant">
          Điểm danh: X=có mặt, P=phép, K=không phép · Tiến độ: ✓/X + Tiếp thu · Nhận xét: Giữa kỳ /
          Cuối kỳ.
        </p>
        <button type="button" className="btn btn-ghost" onClick={downloadTemplate}>
          <Download className="h-4 w-4" />
          Tải Excel mẫu
        </button>
      </div>

      <form onSubmit={submit} className="card space-y-3">
        <label className="block text-sm font-medium text-foreground">File đã điền dữ liệu</label>
        <input
          type="file"
          accept=".xlsx,.xlsm,.xls"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        {file ? (
          <p className="text-xs text-on-surface-variant">Đã chọn: {file.name}</p>
        ) : null}
        <button className="btn btn-primary" disabled={loading || !file}>
          <Upload className="h-4 w-4" />
          {loading ? "Đang nhập..." : "Nhập dữ liệu"}
        </button>
      </form>

      {result ? (
        <div className="card space-y-2">
          <p className="text-sm font-medium text-foreground">Kết quả import</p>
          <pre className="overflow-x-auto text-sm">{JSON.stringify(result, null, 2)}</pre>
        </div>
      ) : null}
    </div>
  );
}
