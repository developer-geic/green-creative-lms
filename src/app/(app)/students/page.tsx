"use client";

import {
  FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  BookOpen,
  Camera,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { SearchField } from "@/components/SearchField";
import { SelectField } from "@/components/SelectField";
import { useCatalog } from "@/hooks/useCatalog";
import { lmsApi } from "@/lib/api";
import { avatarSrc } from "@/lib/avatar";
import { buildQuery } from "@/lib/utils";
import type { LmsClass, LmsStudent } from "@/types/lms";
import {
  EMPTY_STUDENT_FORM,
  ageFromDob,
  studentFormToBody,
  studentToForm,
  type StudentForm,
} from "./student-form";

function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-foreground">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {children}
      {hint ? <p className="text-[11px] text-on-surface-variant">{hint}</p> : null}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-t border-surface-low pt-4 first:border-t-0 first:pt-0">
      <span className="h-2 w-2 rounded-full bg-primary" />
      <h4 className="text-sm font-semibold text-foreground">{children}</h4>
    </div>
  );
}

function enrollableClasses(classes: LmsClass[], student: LmsStudent | null): LmsClass[] {
  const enrolled = new Set((student?.enrollments || []).map((e) => e.class_id));
  return classes.filter((c) => !c.is_locked && !enrolled.has(c.id));
}

function classEditable(classes: LmsClass[], classId: number): boolean {
  const c = classes.find((x) => x.id === classId);
  return !!c && !c.is_locked;
}

function classLabel(c: LmsClass): string {
  const bits = [c.code];
  if (c.course) bits.push(c.course);
  if (c.time) bits.push(c.time);
  return bits.join(" · ");
}

function FamilyBlock({
  title,
  prefix,
  form,
  onChange,
}: {
  title: string;
  prefix: "father" | "mother" | "guardian";
  form: StudentForm;
  onChange: (patch: Partial<StudentForm>) => void;
}) {
  const nameKey = `${prefix}_name` as keyof StudentForm;
  const yearKey = `${prefix}_birth_year` as keyof StudentForm;
  const occKey = `${prefix}_occupation` as keyof StudentForm;
  const phoneKey = `${prefix}_phone` as keyof StudentForm;
  const resKey = `${prefix}_residence` as keyof StudentForm;

  return (
    <div className="space-y-3 rounded-xl bg-surface-low/50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
        {title}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Họ và tên">
          <input
            className="input"
            value={form[nameKey]}
            onChange={(e) => onChange({ [nameKey]: e.target.value } as Partial<StudentForm>)}
          />
        </Field>
        <Field label="Năm sinh">
          <input
            className="input"
            type="number"
            min={1900}
            max={new Date().getFullYear()}
            placeholder="VD: 1985"
            value={form[yearKey]}
            onChange={(e) => onChange({ [yearKey]: e.target.value } as Partial<StudentForm>)}
          />
        </Field>
        <Field label="Nghề nghiệp">
          <input
            className="input"
            value={form[occKey]}
            onChange={(e) => onChange({ [occKey]: e.target.value } as Partial<StudentForm>)}
          />
        </Field>
        <Field label="Số điện thoại">
          <input
            className="input"
            value={form[phoneKey]}
            onChange={(e) => onChange({ [phoneKey]: e.target.value } as Partial<StudentForm>)}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Nơi cư trú">
            <input
              className="input"
              value={form[resKey]}
              onChange={(e) => onChange({ [resKey]: e.target.value } as Partial<StudentForm>)}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

function EnrollDialog({
  student,
  classes,
  statuses,
  onClose,
  onEnrolled,
}: {
  student: LmsStudent;
  classes: LmsClass[];
  statuses: Array<{ code: string; name: string }>;
  onClose: () => void;
  onEnrolled: () => void;
}) {
  const options = enrollableClasses(classes, student);
  const [classId, setClassId] = useState(options[0] ? String(options[0].id) : "");
  const [status, setStatus] = useState("active");
  const [enrolling, startTransition] = useTransition();

  useEffect(() => {
    if (!options.some((c) => String(c.id) === classId)) {
      setClassId(options[0] ? String(options[0].id) : "");
    }
  }, [options, classId]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!classId) {
      toast.error("Chọn lớp để ghi danh");
      return;
    }
    startTransition(async () => {
      try {
        await lmsApi.createEnrollment(classId, {
          student_id: student.id,
          status,
        });
        toast.success("Đã ghi danh học viên vào lớp");
        onEnrolled();
        onClose();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Không ghi danh được");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#213145]/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-surface shadow-xl"
      >
        <div className="flex items-center justify-between bg-surface-low px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Ghi danh vào lớp</h3>
            <p className="text-xs text-on-surface-variant">{student.full_name}</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-high"
            onClick={onClose}
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 p-5">
          {options.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              Không còn lớp khả dụng (chưa được gán lớp, lớp đã khóa, hoặc học viên đã có trong mọi
              lớp của bạn).
            </p>
          ) : (
            <>
              <Field label="Lớp" required>
                <SelectField
                  required
                  value={classId}
                  placeholder="- Chọn lớp -"
                  options={options.map((c) => ({
                    value: String(c.id),
                    label: classLabel(c),
                  }))}
                  onChange={setClassId}
                />
              </Field>
              <Field label="Trạng thái">
                <SelectField
                  value={status}
                  options={
                    statuses.length
                      ? statuses.map((s) => ({ value: s.code, label: s.name }))
                      : [{ value: "active", label: "Đang học" }]
                  }
                  onChange={setStatus}
                />
              </Field>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-surface-low px-5 py-4">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Hủy
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={enrolling || options.length === 0}
          >
            Ghi danh
          </button>
        </div>
      </form>
    </div>
  );
}

function EnrollmentSection({
  student,
  classes,
  statuses,
  canEnroll,
  onChanged,
}: {
  student: LmsStudent;
  classes: LmsClass[];
  statuses: Array<{ code: string; name: string }>;
  canEnroll: boolean;
  onChanged: () => void;
}) {
  const options = enrollableClasses(classes, student);
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("active");
  const [busy, startTransition] = useTransition();

  if (!canEnroll) return null;

  function addEnrollment() {
    if (!classId) {
      toast.error("Chọn lớp để ghi danh");
      return;
    }
    startTransition(async () => {
      try {
        await lmsApi.createEnrollment(classId, {
          student_id: student.id,
          status,
        });
        toast.success("Đã ghi danh vào lớp");
        setClassId("");
        onChanged();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Không ghi danh được");
      }
    });
  }

  function changeStatus(enrollmentId: number, classIdNum: number, next: string) {
    startTransition(async () => {
      try {
        await lmsApi.updateEnrollment(classIdNum, enrollmentId, { status: next });
        toast.success("Đã cập nhật trạng thái");
        onChanged();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Không cập nhật được");
      }
    });
  }

  function removeEnrollment(enrollmentId: number, classIdNum: number, label: string) {
    if (!confirm(`Gỡ học viên khỏi lớp ${label}?`)) return;
    startTransition(async () => {
      try {
        await lmsApi.deleteEnrollment(classIdNum, enrollmentId);
        toast.success("Đã gỡ khỏi lớp");
        onChanged();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Không gỡ được");
      }
    });
  }

  return (
    <>
      <SectionTitle>Lớp đang tham gia</SectionTitle>
      <div className="space-y-2">
        {(student.enrollments || []).length === 0 ? (
          <p className="text-xs text-on-surface-variant">Chưa ghi danh lớp nào.</p>
        ) : (
          (student.enrollments || []).map((e) => {
            const editable = classEditable(classes, e.class_id);
            return (
              <div
                key={e.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface-low/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">
                    {e.class_code || `Lớp #${e.class_id}`}
                  </div>
                  {!editable ? (
                    <div className="text-[11px] text-on-surface-variant">
                      {e.status_name || e.status || "—"}
                    </div>
                  ) : null}
                </div>
                {editable ? (
                  <div className="flex items-center gap-2">
                    <select
                      className="input h-8 w-auto min-w-[8rem] text-xs"
                      value={e.status || "active"}
                      disabled={busy}
                      onChange={(ev) => changeStatus(e.id, e.class_id, ev.target.value)}
                    >
                      {(statuses.length
                        ? statuses
                        : [{ code: e.status || "active", name: e.status_name || e.status || "—" }]
                      ).map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-danger hover:bg-danger-container"
                      title="Gỡ khỏi lớp"
                      disabled={busy}
                      onClick={() =>
                        removeEnrollment(e.id, e.class_id, e.class_code || String(e.class_id))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_8rem_auto]">
        <Field label="Thêm vào lớp">
          {options.length === 0 ? (
            <p className="text-xs text-on-surface-variant">Không còn lớp khả dụng để ghi danh.</p>
          ) : (
            <SelectField
              value={classId}
              placeholder="- Chọn lớp -"
              options={[
                { value: "", label: "- Chọn lớp -" },
                ...options.map((c) => ({ value: String(c.id), label: classLabel(c) })),
              ]}
              onChange={setClassId}
            />
          )}
        </Field>
        <Field label="Trạng thái">
          <SelectField
            value={status}
            options={
              statuses.length
                ? statuses.map((s) => ({ value: s.code, label: s.name }))
                : [{ value: "active", label: "Đang học" }]
            }
            onChange={setStatus}
          />
        </Field>
        <div className="flex items-end">
          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={busy || !classId || options.length === 0}
            onClick={addEnrollment}
          >
            Ghi danh
          </button>
        </div>
      </div>
    </>
  );
}

function StudentFormModal({
  editing,
  pending,
  form,
  avatarPreview,
  classes,
  statuses,
  canEnroll,
  enrollClassId,
  onEnrollClassIdChange,
  onChange,
  onAvatarPick,
  onClose,
  onSubmit,
  onEnrollmentChanged,
}: {
  editing: LmsStudent | null;
  pending: boolean;
  form: StudentForm;
  avatarPreview: string | null;
  classes: LmsClass[];
  statuses: Array<{ code: string; name: string }>;
  canEnroll: boolean;
  enrollClassId: string;
  onEnrollClassIdChange: (v: string) => void;
  onChange: (patch: Partial<StudentForm>) => void;
  onAvatarPick: (file: File | null) => void;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  onEnrollmentChanged: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const age = ageFromDob(form.date_of_birth);
  const createEnrollOptions = enrollableClasses(classes, null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#213145]/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={onSubmit}
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface shadow-xl"
      >
        <div className="flex items-center justify-between bg-surface-low px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
              {editing ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold text-foreground">
                {editing ? "Sửa học viên" : "Thêm học viên"}
              </h3>
              <span className="text-xs text-on-surface-variant">
                {editing
                  ? "Cập nhật hồ sơ master và lớp đang tham gia"
                  : "Tạo hồ sơ master, có thể ghi danh lớp ngay"}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-high"
            onClick={onClose}
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="flex max-h-[85dvh] flex-col gap-4 overflow-y-auto p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-surface-low">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
                  <UserRound className="h-8 w-8" />
                </div>
              )}
              <button
                type="button"
                className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-on-primary shadow"
                title="Chọn ảnh"
                onClick={() => fileRef.current?.click()}
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                className="hidden"
                onChange={(e) => onAvatarPick(e.target.files?.[0] || null)}
              />
            </div>
            <p className="text-xs text-on-surface-variant">
              JPEG / PNG / WebP, tối đa 2MB. Ảnh lưu sau khi tạo hoặc khi lưu chỉnh sửa.
            </p>
          </div>

          <SectionTitle>Thông tin cơ bản</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Họ tên" required>
              <input
                className="input"
                required
                value={form.full_name}
                onChange={(e) => onChange({ full_name: e.target.value })}
              />
            </Field>
            <Field label="Tên tiếng Anh">
              <input
                className="input"
                value={form.english_name}
                onChange={(e) => onChange({ english_name: e.target.value })}
              />
            </Field>
            <Field label="Ngày sinh" hint={age != null ? `Tuổi: ${age}` : undefined}>
              <input
                className="input"
                type="date"
                value={form.date_of_birth}
                onChange={(e) => onChange({ date_of_birth: e.target.value })}
              />
            </Field>
            <Field label="Giới tính">
              <select
                className="input"
                value={form.gender}
                onChange={(e) =>
                  onChange({ gender: e.target.value as StudentForm["gender"] })
                }
              >
                <option value="">—</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </Field>
            <Field label="Trường đang học">
              <input
                className="input"
                value={form.school}
                onChange={(e) => onChange({ school: e.target.value })}
              />
            </Field>
            <Field label="Dân tộc">
              <input
                className="input"
                value={form.ethnicity}
                onChange={(e) => onChange({ ethnicity: e.target.value })}
              />
            </Field>
            <Field label="Tôn giáo">
              <input
                className="input"
                value={form.religion}
                onChange={(e) => onChange({ religion: e.target.value })}
              />
            </Field>
            <Field label="Nơi sinh">
              <input
                className="input"
                value={form.place_of_birth}
                onChange={(e) => onChange({ place_of_birth: e.target.value })}
              />
            </Field>
          </div>

          <SectionTitle>Địa chỉ & liên hệ</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Quê quán" hint="Ghi rõ xã/phường, huyện/quận, tỉnh/thành phố nếu có">
                <input
                  className="input"
                  value={form.hometown}
                  onChange={(e) => onChange({ hometown: e.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Hộ khẩu thường trú">
                <textarea
                  className="input min-h-[72px] py-2"
                  value={form.permanent_address}
                  onChange={(e) => onChange({ permanent_address: e.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Địa chỉ hiện tại" hint="Nơi ở hiện tại để liên lạc khi cần">
                <textarea
                  className="input min-h-[72px] py-2"
                  value={form.current_address}
                  onChange={(e) => onChange({ current_address: e.target.value })}
                />
              </Field>
            </div>
            <Field label="SĐT học sinh">
              <input
                className="input"
                value={form.phone}
                onChange={(e) => onChange({ phone: e.target.value })}
              />
            </Field>
            <Field label="SĐT phụ huynh">
              <input
                className="input"
                value={form.parent_phone}
                onChange={(e) => onChange({ parent_phone: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => onChange({ email: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Ghi chú">
                <textarea
                  className="input min-h-[72px] py-2"
                  value={form.notes}
                  onChange={(e) => onChange({ notes: e.target.value })}
                />
              </Field>
            </div>
          </div>

          <SectionTitle>Thông tin gia đình</SectionTitle>
          <FamilyBlock title="Cha" prefix="father" form={form} onChange={onChange} />
          <FamilyBlock title="Mẹ" prefix="mother" form={form} onChange={onChange} />
          <FamilyBlock title="Người giám hộ" prefix="guardian" form={form} onChange={onChange} />

          {editing && canEnroll ? (
            <EnrollmentSection
              student={editing}
              classes={classes}
              statuses={statuses}
              canEnroll={canEnroll}
              onChanged={onEnrollmentChanged}
            />
          ) : null}

          {!editing && canEnroll ? (
            <>
              <SectionTitle>Ghi danh ngay (tuỳ chọn)</SectionTitle>
              <Field label="Lớp">
                {createEnrollOptions.length === 0 ? (
                  <p className="text-xs text-on-surface-variant">
                    Không có lớp khả dụng để ghi danh ngay.
                  </p>
                ) : (
                  <SelectField
                    value={enrollClassId}
                    placeholder="- Không ghi danh -"
                    options={[
                      { value: "", label: "- Không ghi danh -" },
                      ...createEnrollOptions.map((c) => ({
                        value: String(c.id),
                        label: classLabel(c),
                      })),
                    ]}
                    onChange={onEnrollClassIdChange}
                  />
                )}
              </Field>
            </>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-surface-low px-6 py-4">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {editing ? "Lưu thay đổi" : "Thêm học viên"}
          </button>
        </div>
      </form>
    </div>
  );
}

function StudentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<LmsStudent[]>([]);
  const [classes, setClasses] = useState<LmsClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [classId, setClassId] = useState(searchParams.get("class_id") || "");
  const [canManage, setCanManage] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<LmsStudent | null>(null);
  const [enrollTarget, setEnrollTarget] = useState<LmsStudent | null>(null);
  const [form, setForm] = useState<StudentForm>(EMPTY_STUDENT_FORM);
  const [pendingAvatar, setPendingAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [createEnrollClassId, setCreateEnrollClassId] = useState("");
  const { items: statusItems } = useCatalog("student-statuses");

  const statuses = useMemo(
    () => statusItems.map((s) => ({ code: s.code, name: s.name })),
    [statusItems],
  );

  const canEnroll = isAdmin || classes.some((c) => !c.is_locked);
  const showActions = canManage || isAdmin || canEnroll;
  const modalOpen = showCreate || editing != null;

  function loadStudents(nextQ = q, nextClassId = classId) {
    const query = buildQuery({ q: nextQ, class_id: nextClassId });
    router.replace(`/students${query}`);
    setLoading(true);
    lmsApi
      .students(query)
      .then((res) => {
        startTransition(() => {
          const list: LmsStudent[] = res.data || [];
          setItems(list);
          setEditing((prev) => {
            if (!prev) return prev;
            return list.find((s: LmsStudent) => s.id === prev.id) || prev;
          });
          setEnrollTarget((prev) => {
            if (!prev) return prev;
            return list.find((s: LmsStudent) => s.id === prev.id) || prev;
          });
          setLoading(false);
        });
      })
      .catch((e) => {
        toast.error(e.message);
        setLoading(false);
      });
  }

  useEffect(() => {
    Promise.all([
      lmsApi.classes("?limit=100"),
      lmsApi.students(buildQuery({ q, class_id: classId })),
      lmsApi.me(),
    ])
      .then(([classesRes, studentsRes, meRes]) => {
        setClasses(classesRes.data || []);
        setItems(studentsRes.data || []);
        const role = meRes.data?.user?.role;
        const flags = meRes.data?.user?.catalog_permissions;
        setCanManage(role === "admin" || !!flags?.manage_students);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetAvatarState() {
    setPendingAvatar(null);
    setAvatarPreview(null);
  }

  function closeModal() {
    setShowCreate(false);
    setEditing(null);
    setForm(EMPTY_STUDENT_FORM);
    setCreateEnrollClassId("");
    resetAvatarState();
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_STUDENT_FORM);
    setCreateEnrollClassId("");
    resetAvatarState();
    setShowCreate(true);
  }

  function openEdit(student: LmsStudent) {
    setShowCreate(false);
    setEditing(student);
    setForm(studentToForm(student));
    setPendingAvatar(null);
    setAvatarPreview(avatarSrc(student.avatar));
  }

  function patchForm(patch: Partial<StudentForm>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function onAvatarPick(file: File | null) {
    if (!file) return;
    setPendingAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function saveStudent(e: FormEvent) {
    e.preventDefault();
    const body = studentFormToBody(form);
    startTransition(async () => {
      try {
        if (editing) {
          await lmsApi.updateStudent(editing.id, body);
          if (pendingAvatar) {
            await lmsApi.uploadStudentAvatar(editing.id, pendingAvatar);
          }
          toast.success("Đã cập nhật học viên");
        } else {
          const res = await lmsApi.createStudent(body);
          const created = res.data;
          if (pendingAvatar && created?.id) {
            await lmsApi.uploadStudentAvatar(created.id, pendingAvatar);
          }
          if (canEnroll && createEnrollClassId && created?.id) {
            try {
              await lmsApi.createEnrollment(createEnrollClassId, {
                student_id: created.id,
                status: "active",
              });
              toast.success("Đã thêm học viên và ghi danh vào lớp");
            } catch (enrollErr: unknown) {
              toast.success("Đã thêm học viên");
              toast.error(
                enrollErr instanceof Error
                  ? enrollErr.message
                  : "Tạo học viên OK nhưng ghi danh lớp thất bại",
              );
            }
          } else {
            toast.success("Đã thêm học viên");
          }
        }
        closeModal();
        loadStudents();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Không lưu được học viên");
      }
    });
  }

  function removeStudent(student: LmsStudent) {
    if (!confirm(`Xóa học viên "${student.full_name}"?`)) return;
    startTransition(async () => {
      try {
        await lmsApi.deleteStudent(student.id);
        toast.success("Đã xóa học viên");
        if (editing?.id === student.id) closeModal();
        loadStudents();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Không xóa được học viên");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">Học viên</h1>
          <p className="text-sm text-on-surface-variant">
            Hồ sơ master dùng chung nhiều lớp. Ghi danh vào lớp ngay tại đây (lớp theo quyền của bạn).
          </p>
        </div>
        {canManage || isAdmin ? (
          <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Thêm học viên
          </button>
        ) : null}
      </div>
      <div className="card flex flex-wrap gap-3">
        <SearchField
          className="w-full"
          wrapperClassName="w-full sm:max-w-xs"
          placeholder="Tìm tên..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="text"
        />
        <select
          className="input w-full sm:max-w-xs"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
        >
          <option value="">Tất cả lớp</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={() => loadStudents()}>
          Lọc
        </button>
      </div>
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-slate-500">
                <th className="py-2">Họ tên</th>
                <th>Tên EN</th>
                <th>Lớp / trạng thái</th>
                <th>SĐT</th>
                {showActions ? <th className="text-right">Hành động</th> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((s) => {
                const thumb = avatarSrc(s.avatar);
                const phoneDisplay = s.parent_phone || s.phone || "—";
                return (
                  <tr key={s.id} className="border-b border-border/70">
                    <td className="py-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-low">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <UserRound className="h-4 w-4 text-on-surface-variant" />
                          )}
                        </div>
                        <span className="font-medium">{s.full_name}</span>
                      </div>
                    </td>
                    <td className="text-slate-600">{s.english_name || "—"}</td>
                    <td className="text-xs text-slate-600">
                      {(s.enrollments || [])
                        .map((e) => `${e.class_code || e.class_id} (${e.status_name || e.status})`)
                        .join(", ") || "—"}
                    </td>
                    <td>{phoneDisplay}</td>
                    {showActions ? (
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEnroll ? (
                            <button
                              type="button"
                              className="rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-surface-low hover:text-foreground"
                              title="Ghi danh vào lớp"
                              onClick={() => setEnrollTarget(s)}
                            >
                              <BookOpen className="h-4 w-4" />
                            </button>
                          ) : null}
                          {canManage || isAdmin ? (
                            <>
                              <button
                                type="button"
                                className="rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-surface-low hover:text-foreground"
                                title="Sửa"
                                onClick={() => openEdit(s)}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="rounded-md p-1.5 text-danger transition-colors hover:bg-danger-container"
                                title="Xóa"
                                onClick={() => removeStudent(s)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && !items.length ? (
          <p className="py-6 text-center text-sm text-slate-500">Không có học viên.</p>
        ) : null}
      </div>
      {modalOpen ? (
        <StudentFormModal
          editing={editing}
          pending={pending}
          form={form}
          avatarPreview={avatarPreview}
          classes={classes}
          statuses={statuses}
          canEnroll={canEnroll}
          enrollClassId={createEnrollClassId}
          onEnrollClassIdChange={setCreateEnrollClassId}
          onChange={patchForm}
          onAvatarPick={onAvatarPick}
          onClose={closeModal}
          onSubmit={saveStudent}
          onEnrollmentChanged={loadStudents}
        />
      ) : null}
      {enrollTarget ? (
        <EnrollDialog
          student={enrollTarget}
          classes={classes}
          statuses={statuses}
          onClose={() => setEnrollTarget(null)}
          onEnrolled={loadStudents}
        />
      ) : null}
    </div>
  );
}

export default function StudentsPage() {
  return (
    <Suspense fallback={<div>Đang tải...</div>}>
      <StudentsContent />
    </Suspense>
  );
}
