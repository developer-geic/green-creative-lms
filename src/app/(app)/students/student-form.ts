export type StudentGender = "" | "male" | "female" | "other";

export type StudentForm = {
  full_name: string;
  english_name: string;
  parent_phone: string;
  notes: string;
  date_of_birth: string;
  school: string;
  gender: StudentGender;
  ethnicity: string;
  religion: string;
  place_of_birth: string;
  hometown: string;
  permanent_address: string;
  current_address: string;
  phone: string;
  email: string;
  father_name: string;
  father_birth_year: string;
  father_occupation: string;
  father_phone: string;
  father_residence: string;
  mother_name: string;
  mother_birth_year: string;
  mother_occupation: string;
  mother_phone: string;
  mother_residence: string;
  guardian_name: string;
  guardian_birth_year: string;
  guardian_occupation: string;
  guardian_phone: string;
  guardian_residence: string;
};

export const EMPTY_STUDENT_FORM: StudentForm = {
  full_name: "",
  english_name: "",
  parent_phone: "",
  notes: "",
  date_of_birth: "",
  school: "",
  gender: "",
  ethnicity: "",
  religion: "",
  place_of_birth: "",
  hometown: "",
  permanent_address: "",
  current_address: "",
  phone: "",
  email: "",
  father_name: "",
  father_birth_year: "",
  father_occupation: "",
  father_phone: "",
  father_residence: "",
  mother_name: "",
  mother_birth_year: "",
  mother_occupation: "",
  mother_phone: "",
  mother_residence: "",
  guardian_name: "",
  guardian_birth_year: "",
  guardian_occupation: "",
  guardian_phone: "",
  guardian_residence: "",
};

export function ageFromDob(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso.slice(0, 10) + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

export function genderLabel(gender?: string | null): string {
  if (gender === "male") return "Nam";
  if (gender === "female") return "Nữ";
  if (gender === "other") return "Khác";
  return "—";
}

function emptyToNull(value: string): string | null {
  const t = value.trim();
  return t ? t : null;
}

function yearOrNull(value: string): number | null {
  const t = value.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Build API body from form; empty strings become null. */
export function studentFormToBody(form: StudentForm) {
  return {
    full_name: form.full_name.trim(),
    english_name: emptyToNull(form.english_name),
    parent_phone: emptyToNull(form.parent_phone),
    notes: emptyToNull(form.notes),
    date_of_birth: emptyToNull(form.date_of_birth),
    school: emptyToNull(form.school),
    gender: form.gender || null,
    ethnicity: emptyToNull(form.ethnicity),
    religion: emptyToNull(form.religion),
    place_of_birth: emptyToNull(form.place_of_birth),
    hometown: emptyToNull(form.hometown),
    permanent_address: emptyToNull(form.permanent_address),
    current_address: emptyToNull(form.current_address),
    phone: emptyToNull(form.phone),
    email: emptyToNull(form.email),
    father_name: emptyToNull(form.father_name),
    father_birth_year: yearOrNull(form.father_birth_year),
    father_occupation: emptyToNull(form.father_occupation),
    father_phone: emptyToNull(form.father_phone),
    father_residence: emptyToNull(form.father_residence),
    mother_name: emptyToNull(form.mother_name),
    mother_birth_year: yearOrNull(form.mother_birth_year),
    mother_occupation: emptyToNull(form.mother_occupation),
    mother_phone: emptyToNull(form.mother_phone),
    mother_residence: emptyToNull(form.mother_residence),
    guardian_name: emptyToNull(form.guardian_name),
    guardian_birth_year: yearOrNull(form.guardian_birth_year),
    guardian_occupation: emptyToNull(form.guardian_occupation),
    guardian_phone: emptyToNull(form.guardian_phone),
    guardian_residence: emptyToNull(form.guardian_residence),
  };
}

export function studentToForm(student: {
  full_name?: string | null;
  english_name?: string | null;
  parent_phone?: string | null;
  notes?: string | null;
  date_of_birth?: string | null;
  school?: string | null;
  gender?: string | null;
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
}): StudentForm {
  const gender =
    student.gender === "male" || student.gender === "female" || student.gender === "other"
      ? student.gender
      : "";
  return {
    full_name: student.full_name || "",
    english_name: student.english_name || "",
    parent_phone: student.parent_phone || "",
    notes: student.notes || "",
    date_of_birth: student.date_of_birth ? String(student.date_of_birth).slice(0, 10) : "",
    school: student.school || "",
    gender,
    ethnicity: student.ethnicity || "",
    religion: student.religion || "",
    place_of_birth: student.place_of_birth || "",
    hometown: student.hometown || "",
    permanent_address: student.permanent_address || "",
    current_address: student.current_address || "",
    phone: student.phone || "",
    email: student.email || "",
    father_name: student.father_name || "",
    father_birth_year: student.father_birth_year != null ? String(student.father_birth_year) : "",
    father_occupation: student.father_occupation || "",
    father_phone: student.father_phone || "",
    father_residence: student.father_residence || "",
    mother_name: student.mother_name || "",
    mother_birth_year: student.mother_birth_year != null ? String(student.mother_birth_year) : "",
    mother_occupation: student.mother_occupation || "",
    mother_phone: student.mother_phone || "",
    mother_residence: student.mother_residence || "",
    guardian_name: student.guardian_name || "",
    guardian_birth_year:
      student.guardian_birth_year != null ? String(student.guardian_birth_year) : "",
    guardian_occupation: student.guardian_occupation || "",
    guardian_phone: student.guardian_phone || "",
    guardian_residence: student.guardian_residence || "",
  };
}
