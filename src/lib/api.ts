import { getServerSession } from "next-auth";
import { getSession } from "next-auth/react";
import { authOptions } from "@/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8880/api/v1";

export type ApiError = {
  status: "error";
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
};

let clientAccessToken: string | undefined;

/** Keep client token in sync with SessionProvider to avoid getSession() per request. */
export function setClientAccessToken(token?: string | null) {
  clientAccessToken = token || undefined;
}

async function getToken() {
  if (typeof window === "undefined") {
    const session = await getServerSession(authOptions);
    return session?.accessToken as string | undefined;
  }
  if (clientAccessToken) {
    return clientAccessToken;
  }
  const session = await getSession();
  clientAccessToken = session?.accessToken as string | undefined;
  return clientAccessToken;
}

export async function lmsFetch<T = any>(
  path: string,
  options: RequestInit & { auth?: boolean; formData?: boolean } = {},
): Promise<T> {
  const { auth = true, formData, headers, ...rest } = options;
  const token = auth ? await getToken() : undefined;

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(formData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw {
      status: "error",
      statusCode: res.status,
      message: json.message || "Request failed",
      errors: json.errors,
    } as ApiError;
  }

  return json as T;
}

export const lmsApi = {
  lookup: (email: string) =>
    lmsFetch("/lms/auth/lookup", {
      method: "POST",
      body: JSON.stringify({ email }),
      auth: false,
    }),
  requestAccess: (payload: { email: string; name: string }) =>
    lmsFetch("/lms/auth/request-access", {
      method: "POST",
      body: JSON.stringify(payload),
      auth: false,
    }),
  setPassword: (payload: {
    email: string;
    password: string;
    password_confirmation: string;
    name?: string;
  }) =>
    lmsFetch("/lms/auth/set-password", {
      method: "POST",
      body: JSON.stringify(payload),
      auth: false,
    }),
  me: () => lmsFetch("/lms/auth/me"),
  dashboard: () => lmsFetch("/lms/dashboard"),
  classes: (query = "") => lmsFetch(`/lms/classes${query}`),
  classDetail: (id: number | string) => lmsFetch(`/lms/classes/${id}`),
  createClass: (body: unknown) =>
    lmsFetch("/lms/classes", { method: "POST", body: JSON.stringify(body) }),
  updateClass: (id: number | string, body: unknown) =>
    lmsFetch(`/lms/classes/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  endClass: (id: number | string) =>
    lmsFetch(`/lms/classes/${id}/end`, { method: "POST" }),
  updateClassStatus: (id: number | string, status: string) =>
    lmsFetch(`/lms/classes/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
  students: (query = "") => lmsFetch(`/lms/students${query}`),
  createStudent: (body: unknown) =>
    lmsFetch("/lms/students", { method: "POST", body: JSON.stringify(body) }),
  updateStudent: (id: number | string, body: unknown) =>
    lmsFetch(`/lms/students/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  studentDetail: (id: number | string) => lmsFetch(`/lms/students/${id}`),
  attendance: (classId: number | string, query = "") =>
    lmsFetch(`/lms/classes/${classId}/attendance${query}`),
  upsertAttendance: (sessionId: number | string, records: unknown[]) =>
    lmsFetch(`/lms/attendance-sessions/${sessionId}/records`, {
      method: "PUT",
      body: JSON.stringify({ records }),
    }),
  progress: (classId: number | string, query = "") =>
    lmsFetch(`/lms/classes/${classId}/progress${query}`),
  upsertProgress: (sessionId: number | string, records: unknown[]) =>
    lmsFetch(`/lms/attendance-sessions/${sessionId}/progress`, {
      method: "PUT",
      body: JSON.stringify({ records }),
    }),
  assessments: (query = "") => lmsFetch(`/lms/assessments${query}`),
  saveAssessment: (body: unknown) =>
    lmsFetch("/lms/assessments", { method: "POST", body: JSON.stringify(body) }),
  announcements: (query = "") => lmsFetch(`/lms/announcements${query}`),
  unreadCount: () => lmsFetch("/lms/announcements/unread-count"),
  createAnnouncement: (body: unknown) =>
    lmsFetch("/lms/announcements", { method: "POST", body: JSON.stringify(body) }),
  recallAnnouncement: (id: number | string) =>
    lmsFetch(`/lms/announcements/${id}/recall`, { method: "POST" }),
  markAnnouncementRead: (id: number | string) =>
    lmsFetch(`/lms/announcements/${id}/read`, { method: "POST" }),
  teacherProfile: () => lmsFetch("/lms/teacher-profile"),
  updateTeacherProfile: (body: unknown) =>
    lmsFetch("/lms/teacher-profile", { method: "PUT", body: JSON.stringify(body) }),
  stats: (query = "") => lmsFetch(`/lms/stats${query}`),
  users: (query = "") => lmsFetch(`/lms/users${query}`),
  userDetail: (id: number | string) => lmsFetch(`/lms/users/${id}`),
  approveUser: (id: number | string, role: string) =>
    lmsFetch(`/lms/users/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ role }),
    }),
  createUser: (body: unknown) =>
    lmsFetch("/lms/users", { method: "POST", body: JSON.stringify(body) }),
  reviewProfileRequest: (id: number | string, action: "approve" | "reject", note?: string) =>
    lmsFetch(`/lms/teacher-profile-requests/${id}/review`, {
      method: "POST",
      body: JSON.stringify({ action, review_note: note }),
    }),
  importExcel: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return lmsFetch("/lms/import/excel", {
      method: "POST",
      body: fd,
      formData: true,
    });
  },
};
