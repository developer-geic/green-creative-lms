import type { ProfileFieldDiff } from "@/types/lms";

export const PROFILE_FIELD_LABELS: Record<string, string> = {
  full_name: "Họ và tên",
  phone: "Số điện thoại",
  dob: "Ngày sinh",
  address: "Địa chỉ",
  bio: "Tiểu sử",
  certificate: "Chứng chỉ",
  experience: "Kinh nghiệm",
};

export const PROFILE_FIELD_KEYS = [
  "full_name",
  "phone",
  "dob",
  "address",
  "certificate",
  "experience",
  "bio",
] as const;

export type ProfileFieldKey = (typeof PROFILE_FIELD_KEYS)[number];

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  teacher: "Giáo viên",
};

const USER_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  disabled: "Vô hiệu",
};

const REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

const CLASS_STATUS_LABELS: Record<string, string> = {
  active: "Đang hoạt động",
  inactive: "Ngừng hoạt động",
  ended: "Đã kết thúc",
};

const CLASS_ROLE_LABELS: Record<string, string> = {
  teacher: "Giáo viên",
  assistant: "Trợ giảng",
  lead: "Giáo viên chính",
};

export function roleLabel(role?: string | null): string {
  if (!role) return "—";
  return ROLE_LABELS[role] || role;
}

export function userStatusLabel(status?: string | null): string {
  if (!status) return "—";
  return USER_STATUS_LABELS[status] || status;
}

export function userStatusPillClass(status?: string | null): string {
  if (status === "approved") return "pill pill-good";
  if (status === "pending") return "pill pill-warn";
  if (status === "disabled") return "pill pill-danger";
  return "pill pill-neutral";
}

export function requestStatusLabel(status?: string | null): string {
  if (!status) return "—";
  return REQUEST_STATUS_LABELS[status] || status;
}

export function requestStatusPillClass(status?: string | null): string {
  if (status === "approved") return "pill pill-good";
  if (status === "pending") return "pill pill-warn";
  if (status === "rejected") return "pill pill-danger";
  return "pill pill-neutral";
}

export function classStatusLabel(status?: string | null): string {
  if (!status) return "—";
  return CLASS_STATUS_LABELS[status] || status;
}

export function classStatusPillClass(status?: string | null): string {
  if (status === "active") return "pill pill-good";
  if (status === "ended") return "pill pill-warn";
  return "pill pill-neutral";
}

export function classRoleLabel(role?: string | null): string {
  if (!role) return "—";
  return CLASS_ROLE_LABELS[role] || role;
}

export function formatDob(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return "";
}

export function displayValue(value: unknown): string {
  if (value == null || value === "") return "—";
  return String(value);
}

/** Normalize payload entry to { old, new }; plain strings become new-only. */
export function parsePayloadDiff(entry: unknown): ProfileFieldDiff {
  if (entry == null) return { old: null, new: null };
  if (typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean") {
    return { old: null, new: String(entry) };
  }
  if (typeof entry === "object") {
    const obj = entry as Record<string, unknown>;
    return {
      old: obj.old == null || obj.old === "" ? null : String(obj.old),
      new: obj.new == null || obj.new === "" ? null : String(obj.new),
    };
  }
  return { old: null, new: null };
}
