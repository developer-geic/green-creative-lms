export type CatalogPermissions = {
  manage_programs: boolean;
  manage_courses: boolean;
  manage_students: boolean;
  manage_student_statuses: boolean;
  manage_absorption_levels: boolean;
  manage_classes: boolean;
};

export type LmsUser = {
  id: number;
  email: string;
  name?: string | null;
  avatar?: string | null;
  phone?: string | null;
  role: "admin" | "teacher" | null;
  status: "pending" | "approved" | "disabled";
  catalog_permissions?: CatalogPermissions;
};

export type LmsCatalogItem = {
  id: number;
  code: string;
  name: string;
  sort_order?: number;
  is_active?: boolean;
  is_system?: boolean;
  color?: string | null;
  program_id?: number | null;
  program?: { id: number; name: string; code: string } | null;
};

export type LmsClass = {
  id: number;
  code: string;
  program_id?: number | null;
  course_id?: number | null;
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
  students?: LmsStudent[];
};

export type LmsStudent = {
  id: number;
  enrollment_id?: number;
  class_id?: number | null;
  student_id?: number;
  full_name: string;
  english_name?: string | null;
  parent_phone?: string | null;
  notes?: string | null;
  avatar?: string | null;
  status?: string | null;
  status_id?: number | null;
  status_name?: string | null;
  enrollments?: Array<{
    id: number;
    class_id: number;
    class_code?: string | null;
    status?: string | null;
    status_id?: number | null;
    status_name?: string | null;
  }>;
};

export type StatsSummary = {
  total_classes: number;
  active_classes: number;
  ended_classes: number;
  inactive_classes: number;
  total_students: number;
  attendance_sessions: number | null;
  has_time_filter: boolean;
};

export type StatsByTeacher = {
  teacher_id: number | null;
  teacher_name: string;
  classes: number;
  active: number;
  ended: number;
  inactive: number;
  students: number;
  students_active: number;
};

export type StatsPayload = {
  summary: StatsSummary;
  by_teacher: StatsByTeacher[];
};
