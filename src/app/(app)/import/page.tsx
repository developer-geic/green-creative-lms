"use client";

import { useState } from "react";
import { toast } from "sonner";
import { lmsApi } from "@/lib/api";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast.error("Chọn file Excel");
    setLoading(true);
    try {
      const res = await lmsApi.importExcel(file);
      setResult(res.data);
      toast.success("Import thành công");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-primary-dark">Import Excel</h1>
      <div className="card text-sm text-slate-600">
        Hỗ trợ sheet: 01_CLASS, 02_STUDENT, 03_LOG_DIEMDANH, 04_LOG_TIENDO, 05_LOG_NHANXET, ATT_CONFIG.
      </div>
      <form onSubmit={submit} className="card space-y-3">
        <input type="file" accept=".xlsx,.xlsm,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button className="btn btn-primary" disabled={loading}>
          {loading ? "Đang nhập..." : "Nhập dữ liệu"}
        </button>
      </form>
      {result && (
        <div className="card">
          <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
