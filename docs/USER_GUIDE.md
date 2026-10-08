# Hướng dẫn sử dụng LMS Sáng Tạo Xanh

LMS nội bộ dùng để quản lý lớp, học viên, điểm danh, tiến độ và đánh giá.

- **Địa chỉ local:** http://localhost:3001  
- **Địa chỉ production (dự kiến):** https://lms.sangtaoxanh.edu.vn  

**Hai lớp phân quyền:**

| Lớp | Ý nghĩa |
|-----|---------|
| `role = admin` | Bypass toàn bộ — thấy mọi menu, thao tác được hết |
| Vai trò LMS (`lms_role`) | Gắn cho giáo viên / nhân viên — quyền chi tiết theo module (`view` / `create` / `update` / `delete`) |

Vai trò có sẵn sau seed: **`teacher`** (giáo viên), **`catalog_manager`** (quản lý lớp + danh mục + HV). Có thể tạo thêm trên màn **Quyền & Vai trò**.

---

## 1. Đăng nhập & xin quyền truy cập

### Tài khoản đã có mật khẩu
1. Vào trang Đăng nhập.
2. Nhập email + mật khẩu.
3. Hệ thống chuyển vào **Tổng quan** (nếu có `dashboard.view`).

### Tài khoản mới (chưa có quyền)
1. Ở màn đăng nhập, chọn **Xin quyền truy cập**.
2. Điền họ tên + email.
3. Tài khoản ở trạng thái **Chờ duyệt** — chờ Admin duyệt và gán **vai trò LMS**.
4. Sau khi được duyệt:
   - Nếu chưa có mật khẩu → đặt mật khẩu lần đầu rồi đăng nhập.
   - Nếu Admin đã tạo sẵn mật khẩu → đăng nhập trực tiếp.

### Trạng thái tài khoản
| Status | Ý nghĩa |
|--------|---------|
| `pending` | Chờ Admin duyệt — chưa đăng nhập được |
| `approved` | Đã duyệt — đăng nhập bình thường |
| `disabled` | Bị khóa — không đăng nhập được |

### Phiên đăng nhập hết hạn
- Access token được làm mới tự động (khoảng mỗi phút / khi quay lại tab).
- Nếu refresh thất bại hoặc API trả **401**, hệ thống **tự đăng xuất** và đưa về trang Đăng nhập.
- API trả **403** (không đủ quyền) → trang **Không có quyền truy cập** (`/forbidden`), vẫn giữ phiên đăng nhập.
- URL không tồn tại → trang **404**. Lỗi render nghiêm trọng → trang **500** (có nút Thử lại).

> **Sau khi Admin đổi quyền / vai trò:** user nên **đăng xuất rồi đăng nhập lại** (hoặc F5 sau vài giây) để menu và nút Thêm/Sửa/Xóa cập nhật đúng.

---

## 2. Phân quyền theo module (mới)

### 2.1. Quy ước mã quyền

Format: **`{module}.{hành_động}`**

| Hành động | Ý nghĩa trên UI / API |
|-----------|------------------------|
| `view` | Thấy menu, vào trang, xem danh sách |
| `create` | Nút **Thêm** + API tạo mới |
| `update` | Nút **Sửa** / ghi nhận (điểm danh, tiến độ…) |
| `delete` | Nút **Xóa** + API xóa |

Chỉ có `view` → vào được màn nhưng **không** thấy nút Thêm/Sửa/Xóa (và gọi API mutate sẽ 403).

### 2.2. Bảng quyền theo menu

| Menu | Mã quyền |
|------|----------|
| Tổng quan | `dashboard.view` |
| Điểm danh | `attendance.view`, `attendance.update` |
| Tiến độ & Đánh giá | `progress.view`, `progress.update`, `assessments.view` / `create` / `update` / `delete` |
| Tra cứu học viên | `students.view`, `students.create`, `students.update`, `students.delete` |
| Lớp học | `classes.view`, `classes.viewall`, `classes.create`, `classes.update`, `classes.delete` |
| Danh mục | `catalogs.view` + `programs.*`, `courses.*`, `student_statuses.*`, `absorption_levels.*` |
| Người dùng | `users.view` / `create` / `update` / `delete` |
| Thống kê | `stats.view` |
| Import Excel | `import.view`, `import.create` |
| Thông báo | `announcements.view` / `create` / `update` / `delete` |
| Hồ sơ | `profile.view`, `profile.update` |
| Quyền & Vai trò | `rbac.view` / `create` / `update` / `delete` |

### 2.3. Phạm vi xem lớp (`classes.view` vs `classes.viewall`)

| Quyền | Hành vi |
|--------|---------|
| Chỉ `classes.view` | Chỉ thấy / mở **lớp được gán** (giáo viên phụ trách) |
| Có thêm `classes.viewall` | Thấy **mọi lớp** |
| Admin | Luôn thấy mọi lớp |

- Vào menu **Lớp học** vẫn cần `classes.view`. `classes.viewall` chỉ **mở rộng phạm vi**.
- Tra cứu HV dùng cùng rule: không có `viewall` → chỉ thấy HV thuộc lớp mình được gán.

### 2.4. Vai trò seed sẵn

#### Giáo viên (`teacher`)
- `dashboard`, điểm danh (view+update), tiến độ (view+update), đánh giá (đủ CRUD)
- Tra cứu HV: **chỉ** `students.view` (không thêm/sửa/xóa)
- Thông báo: xem · Hồ sơ: xem + sửa
- **Không** có menu Lớp học / Danh mục (thiếu `classes.view`, `catalogs.view`)

#### Quản lý danh mục (`catalog_manager`)
- Toàn bộ quyền `teacher`
- Thêm: `classes.view` + `classes.viewall` + CRUD lớp
- CRUD học viên, `catalogs.view` + CRUD chương trình / khóa / trạng thái HV / mức tiếp thu

---

## 3. Luồng setup quyền (Admin)

Dùng khi onboard nhân sự hoặc chỉnh quyền theo nghiệp vụ.

### Bước 1 — Init dữ liệu quyền trên server (vận hành)

Chạy một lần sau deploy / khi cập nhật mã quyền mới (container production `be-sangtaoxanh`):

```bash
docker exec be-sangtaoxanh php artisan migrate --force
docker exec be-sangtaoxanh php artisan db:seed --class=LmsRbacSeeder --force
# Tuỳ chọn tạo admin/teacher demo:
docker exec be-sangtaoxanh php artisan db:seed --class=LmsUserSeeder --force
```

Local (container `web-gc`):

```bash
docker exec web-gc php artisan db:seed --class=LmsRbacSeeder --force
```

Seeder tạo: danh sách permission, role `teacher` / `catalog_manager`, menu gắn `*.view`.

### Bước 2 — Cấu hình vai trò trên UI

1. Đăng nhập **admin**.
2. Mở **Quyền & Vai trò** (`/rbac`) — cần `rbac.view` (admin luôn vào được).
3. Tab **Vai trò**:
   - Dùng sẵn `teacher` / `catalog_manager`, hoặc **Thêm vai trò**.
   - **Sửa** → tick từng quyền theo bảng mục 2.2 → Lưu.
4. Tab **Menu** (tuỳ chọn): mỗi mục sidebar gắn `permission_code` dạng `*.view` (vd. Lớp học → `classes.view`).
5. Tab **Quyền**: xem / thêm mã quyền tùy chỉnh (thường không cần nếu đã seed đủ).

### Bước 3 — Gán vai trò cho người dùng

1. Vào **Người dùng**.
2. Duyệt tài khoản `pending` hoặc mở chi tiết user.
3. Chọn **vai trò LMS** (`teacher`, `catalog_manager`, hoặc role tự tạo) → Lưu.
4. Báo user **đăng nhập lại**.

### Bước 4 — Kiểm tra nhanh

| Kỳ vọng | Cách kiểm |
|---------|-----------|
| Teacher vào điểm danh được, không Thêm lớp / không xóa HV | Đăng nhập `teacher` → xem menu & nút |
| Role có `classes.view` + `classes.viewall` | List lớp thấy mọi lớp |
| Chỉ `students.view` | List HV OK; không thấy nút Thêm; API POST → 403 |
| Tick thêm `classes.delete` | Hiện nút Xóa lớp + xóa được |

### Công thức quyền hay dùng

| Nhu cầu | Tick tối thiểu |
|---------|----------------|
| Giáo viên chuẩn | Role `teacher` |
| Quản lớp + danh mục + HV | Role `catalog_manager` |
| Chỉ tra cứu HV | `students.view` (+ `dashboard.view` nếu cần Tổng quan) |
| Tra cứu + sửa HV, không xóa | `students.view` + `students.update` |
| Quản lớp (chỉ lớp được gán) | `classes.view` + `create`/`update`/`delete` — **không** tick `viewall` |
| Thấy mọi lớp, không sửa | `classes.view` + `classes.viewall` |
| Hiện nút xóa lớp sau này | Thêm `classes.delete` vào role |

### Tương thích mã cũ (ít khi tick tay)

Hệ thống vẫn hiểu: `nav.*` ↔ `*.view`, `manage.students` ↔ CRUD học viên, `manage.classes` ↔ CRUD lớp, `view.classes.all` ↔ `classes.viewall`. Khi cấu hình mới nên ưu tiên mã `module.action`.

---

## 4. Vai trò Giáo viên / nhân viên (theo quyền được cấp)

Menu và nút hiện **đúng theo quyền** trên vai trò LMS — không còn “teacher luôn thấy hết”.

Trên màn hình nhỏ (dưới 768px), menu nằm trong **ngăn kéo (drawer)** — bấm nút menu góc trên trái để mở.

### Tổng quan
*(Cần `dashboard.view`)*
- Số lớp đang hoạt động, học viên, buổi học hôm nay (theo phạm vi lớp được phép xem).
- Tỷ lệ có mặt trong tháng (tính trên các ô **đã chấm**).
- Danh sách học viên nghỉ không phép gần đây.

### Lớp học
*(Cần `classes.view`; phạm vi: gán hoặc mọi lớp nếu có `classes.viewall`)*

**Tạo lớp** — cần `classes.create`:
1. Bấm **Thêm lớp**.
2. Chọn **Chương trình** và **Khóa học** từ danh mục (cascade), lịch, giờ, phòng. **Mã lớp** tuỳ chọn — để trống sẽ tự tạo từ tên khóa học + số thứ tự (vd. `scratch_jr-01`); có thể sửa mã sau khi tạo.
3. Chọn **ngày trong tuần** (CN–T7) — dùng để sinh buổi điểm danh.
4. Chọn **ít nhất một giáo viên** (hoặc trợ giảng TA) phụ trách lớp.
5. Lưu → lớp **Đang học**.

**Trạng thái lớp**
| Status | Ý nghĩa | Sửa nội dung? |
|--------|---------|----------------|
| `active` | Đang học | Có (nếu có quyền update tương ứng) |
| `inactive` | Chờ khai giảng / tuyển sinh (thường chỉ Admin đặt) | Không |
| `ended` | Đã kết thúc | Không |

- **Sửa / Kết thúc lớp:** cần `classes.update`.
- **Xóa lớp:** cần `classes.delete`.
- Đổi status qua dropdown / đặt `inactive`: thường dành Admin.
- Chỉ Admin đổi danh sách giáo viên phụ trách khi sửa lớp.
- Lớp khóa (`inactive` / `ended`): không thêm/sửa HV, điểm danh, tiến độ, đánh giá.
- **Sĩ số:** tối thiểu khuyến nghị 5, tối đa 15 học viên / lớp.

### Học viên / Tra cứu HV
*(Cần `students.view`)*
- Học viên là **master** (dùng chung nhiều lớp). Tìm, lọc theo lớp; bấm **Chi tiết** xem hồ sơ + điểm danh / tiến độ / đánh giá.
- **Thêm / Sửa / Xóa** hồ sơ: cần `students.create` / `update` / `delete` — nút ẩn nếu thiếu quyền.
- Hồ sơ master: họ tên, tên EN, ngày sinh (hiển thị tuổi), giới tính, trường, dân tộc, tôn giáo, nơi sinh; địa chỉ; SĐT; thông tin phụ huynh; ghi chú; ảnh đại diện.
- Trong lớp: enroll HV có sẵn hoặc **Thêm HV mới** (cần `students.create` cho HV mới).
- Trạng thái theo enrollment: `active` / `reserved` / `dropped` (và mục danh mục tương ứng).
- Không enroll trùng cùng HV trong một lớp.

### Danh mục
*(Cần `catalogs.view` + quyền từng tab)*
- Tab: Chương trình · Khóa học · Trạng thái HV · Mức tiếp thu — mỗi tab gắn `programs.*` / `courses.*` / …
- Nút Thêm / Sửa / Xóa theo `create` / `update` / `delete` của từng resource.
- **Mã** tuỳ chọn khi thêm (để trống → tự sinh từ tên); có thể sửa sau khi tạo (mã mục hệ thống `is_system` không đổi được).
- **Chương trình** có thể gán **màu** (hiển thị chip trên danh sách lớp).
- Mục hệ thống (`is_system`) không xóa được; có thể soft-disable `is_active`.

### Điểm danh
*(Cần `attendance.view`; ghi điểm danh cần `attendance.update`)*
1. Chọn lớp + tháng/năm.
2. Hệ thống tạo buổi theo `days[]` của lớp.
3. Chấm: **Có mặt** / **Có phép** / **Không phép**.
4. Tỷ lệ có mặt = số **có mặt** / số ô **đã chấm**.

### Tiến độ học
*(Cần `progress.view`; ghi cần `progress.update`)*
- Theo buổi: bài tập (`done` / `missing`), mức tiếp thu từ danh mục.

### Đánh giá (mid / final)
*(Cần `assessments.view`; lưu / xóa theo `create`/`update`/`delete`)*
- Theo lớp + học viên + tháng/năm + kỳ (`mid` / `final`).
- 4 kỹ năng + nhận xét.

### Thông báo
*(Cần `announcements.view`; viết cần `announcements.create`)*
- Xem, đánh dấu đã đọc.
- Viết thông báo (nếu có `create`).
- **Thu hồi:** tác giả trong **2 giờ**; Admin / người có quyền quản lý thông báo thu hồi linh hoạt hơn.

### Hồ sơ cá nhân
*(Cần `profile.view` / `profile.update`)*
- **Lần 1:** sửa hồ sơ GV trực tiếp.
- **Từ lần 2:** gửi yêu cầu → Admin duyệt / từ chối.
- Avatar áp dụng ngay.

---

## 5. Vai trò Admin (`admin`)

Admin **bypass** mọi check quyền (không phụ thuộc tick trên role).

### Menu admin thường dùng thêm
**Quyền & Vai trò** · **Người dùng** · **Thống kê** · **Import Excel** · **Danh mục** (đầy đủ)

### Lớp học
- Xem **mọi lớp**, tạo lớp, gán giáo viên, kết thúc / đặt `inactive` / xóa / mở lại.

### Người dùng
1. Duyệt **pending** → gán role hệ thống (`admin` / `teacher`) và **vai trò LMS** (matrix quyền).
2. Tạo user, khóa (`disabled`), reset mật khẩu.
3. Click tên giáo viên → hồ sơ; (tuỳ bản UI) gắn role LMS.
4. Duyệt yêu cầu đổi hồ sơ GV (từ lần sửa thứ 2).

> Không vô hiệu hóa / xóa **admin cuối cùng**.

### Thống kê / Import
- Thống kê: lọc GV, năm, tháng; KPI lớp / HV.
- Import workbook sheet prototype (`01_CLASS` …) khi đưa dữ liệu cũ vào LMS.

### Thông báo
- Thu hồi bất kỳ thông báo nào, không giới hạn 2 giờ.

---

## 6. So sánh nhanh

| Chức năng | Teacher (seed) | Catalog manager (seed) | Admin |
|-----------|:--------------:|:----------------------:|:-----:|
| Điểm danh / Tiến độ / Đánh giá | ✅ | ✅ | ✅ |
| Tra cứu HV (xem) | ✅ | ✅ | ✅ |
| Thêm / Sửa / Xóa HV | ❌ | ✅ | ✅ |
| Menu Lớp học | ❌ | ✅ (mọi lớp) | ✅ |
| Tạo / sửa / xóa lớp | ❌ | Theo quyền CRUD | ✅ |
| Danh mục | ❌ | ✅ | ✅ |
| Thông báo (xem) | ✅ | ✅ | ✅ |
| Viết thông báo | Theo `announcements.create` | Theo quyền | ✅ |
| Quyền & Vai trò / Users / Stats / Import | ❌ | ❌ | ✅ |

---

## 7. Gợi ý quy trình hàng ngày (Giáo viên)

1. **Tổng quan** — lớp hôm nay, HV nghỉ không phép.
2. **Điểm danh** — chọn lớp + tháng, chấm buổi.
3. **Tiến độ** — BT về nhà / tiếp thu.
4. **Đánh giá** — mid/final theo tháng.
5. **Thông báo** — đọc / gửi (nếu được cấp).

## 8. Gợi ý quy trình Admin khi onboard GV mới

1. GV xin quyền → **Người dùng** duyệt.
2. Gán **vai trò LMS**:
   - Chỉ dạy / điểm danh / tra cứu → `teacher`
   - Cần quản lớp + danh mục + sửa HV → `catalog_manager`
   - Hoặc tạo role riêng trên **Quyền & Vai trò** rồi gán.
3. GV đặt mật khẩu (nếu cần) → đăng nhập lại.
4. Admin **tạo lớp** và **gán giáo viên** (hoặc Import Excel).
5. (Tuỳ chọn) Chỉnh tick quyền trên role (vd. thêm `classes.delete`) → báo GV đăng nhập lại.
6. Theo dõi **Thống kê** theo tháng.

---

## 9. Tài khoản mẫu (môi trường dev)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@lms.local` | `admin123` |
| Teacher | `teacher@lms.local` | `teacher123` |

> Chỉ dùng trên local/staging. Đổi mật khẩu khi deploy thật.

---

## 10. Lưu ý kỹ thuật ngắn (vận hành)

- LMS **tách** website public/CMS: tài khoản `lms_users`, không dùng `users` Spatie.
- Menu lấy từ API (`permission_code` = `*.view`); nút CRUD check `can('resource.action')` trên FE và assert lại trên BE.
- Lớp `inactive`/`ended` khóa sửa nội dung.
- Filter trên URL (F5 không mất bộ lọc trang).
- CORS chỉ cho phép origin FE LMS.
- Seed quyền trên VPS: xem **mục 3 — Bước 1**.
