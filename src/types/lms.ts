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
  date_of_birth?: string | null;
  school?: string | null;
  gender?: "male" | "female" | "other" | string | null;
  ethnicity?: string | null;
  religion?: string | null;
  place_of_birth?: string | null;
  hometown?: string | null;
  permanent_address?: string | null;
  current_address?: string | null;
  phone?: string | null;
  email?: string | null;
  father_name?: string | null;
  father_birth_year?: number | null;
  father_occupation?: string | null;
  father_phone?: string | null;
  father_residence?: string | null;
  mother_name?: string | null;
  mother_birth_year?: number | null;
  mother_occupation?: string | null;
  mother_phone?: string | null;
  mother_residence?: string | null;
  guardian_name?: string | null;
  guardian_birth_year?: number | null;
  guardian_occupation?: string | null;
  guardian_phone?: string | null;
  guardian_residence?: string | null;
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

export type TeacherProfile = {
  id?: number;
  lms_user_id?: number;
  full_name?: string | null;
  phone?: string | null;
  dob?: string | null;
  address?: string | null;
  bio?: string | null;
  avatar?: string | null;
  certificate?: string | null;
  experience?: string | null;
  direct_edit_used?: boolean;
};

export type ProfileFieldDiff = {
  old?: string | null;
  new?: string | null;
};

export type TeacherProfileChangeRequest = {
  id: number;
  status: "pending" | "approved" | "rejected" | string;
  payload?: Record<string, ProfileFieldDiff | string | null> | null;
  created_at?: string | null;
  reviewed_at?: string | null;
  review_note?: string | null;
};

export type UserDetailClassAssignment = {
  id?: number | null;
  code?: string | null;
  status?: string | null;
  role?: string | null;
  course?: string | null;
  program?: string | null;
};

export type UserDetailPayload = {
  user: LmsUser;
  catalog_permissions?: CatalogPermissions;
  teacher_profile?: TeacherProfile | null;
  classes?: UserDetailClassAssignment[];
  change_requests?: TeacherProfileChangeRequest[];
};
