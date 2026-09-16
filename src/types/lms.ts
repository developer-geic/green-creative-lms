export type LmsUser = {
  id: number;
  email: string;
  name?: string | null;
  avatar?: string | null;
  phone?: string | null;
  role: "admin" | "teacher" | null;
  status: "pending" | "approved" | "disabled";
};

export type LmsClass = {
  id: number;
  code: string;
  program?: string | null;
  course?: string | null;
  schedule?: string | null;
  time?: string | null;
  room?: string | null;
  days: number[];
  start_date?: string | null;
  end_date?: string | null;
  note?: string | null;
  status: "active" | "inactive" | "ended";
  is_locked: boolean;
  student_count: number;
  active_student_count: number;
  max_class_size?: number;
  min_class_size?: number;
  below_min_size?: boolean;
  teachers: Array<{
    lms_user_id: number;
    role: string;
    name?: string | null;
    email?: string | null;
  }>;
};

export type LmsStudent = {
  id: number;
  class_id: number;
  full_name: string;
  english_name?: string | null;
  parent_phone?: string | null;
  notes?: string | null;
  status: "active" | "reserved" | "dropped";
};
