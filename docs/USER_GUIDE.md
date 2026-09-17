# Hướng dẫn sử dụng LMS Sáng Tạo Xanh

LMS nội bộ dùng để quản lý lớp, học viên, điểm danh, tiến độ và đánh giá. Có **2 vai trò**: `admin` và `teacher`.

- **Địa chỉ local:** http://localhost:3001  
- **Địa chỉ production (dự kiến):** https://lms.sangtaoxanh.edu.vn  

---

## 1. Đăng nhập & xin quyền truy cập

### Tài khoản đã có mật khẩu
1. Vào trang Đăng nhập.
2. Nhập email + mật khẩu.
3. Hệ thống chuyển vào **Tổng quan**.

### Tài khoản mới (chưa có quyền)
1. Ở màn đăng nhập, chọn **Xin quyền truy cập**.
2. Điền họ tên + email.
3. Tài khoản ở trạng thái **Chờ duyệt** — chờ Admin duyệt và gán role.
4. Sau khi được duyệt:
   - Nếu chưa có mật khẩu → đặt mật khẩu lần đầu rồi đăng nhập.
   - Nếu Admin đã tạo sẵn mật khẩu → đăng nhập trực tiếp.

### Trạng thái tài khoản
| Status | Ý nghĩa |
|--------|---------|
| `pending` | Chờ Admin duyệt — chưa đăng nhập được |
| `approved` | Đã duyệt — đăng nhập bình thường |
| `disabled` | Bị khóa — không đăng nhập được |

---

## 2. Vai trò Giáo viên (`teacher`)

Giáo viên **chỉ thấy / thao tác các lớp được gán** (trong danh sách giáo viên của lớp). Khi **tự tạo lớp**, hệ thống tự gán bạn làm giáo viên của lớp đó.

### Menu
Tổng quan · Lớp học · Học viên · Điểm danh · Tiến độ · Đánh giá · Tra cứu HV · Thông báo · Hồ sơ cá nhân · Danh mục (nếu được cấp quyền)

### Tổng quan
- Số lớp đang hoạt động, học viên, buổi học hôm nay.
- Tỷ lệ có mặt trong tháng (tính trên các ô **đã chấm**).
- Danh sách học viên nghỉ không phép gần đây.

### Lớp học
**Tạo lớp**
1. Bấm **Thêm lớp**.
2. Điền mã lớp (bắt buộc), chọn **Chương trình** và **Khóa học** từ danh mục (cascade), lịch, giờ, phòng.
3. Chọn **ngày trong tuần** (CN–T7) — dùng để sinh buổi điểm danh.
4. Lưu → lớp ở trạng thái **Đang hoạt động**.

**Trạng thái lớp**
| Status | Ý nghĩa | Giáo viên sửa nội dung? |
|--------|---------|-------------------------|
| `active` | Đang học | Có |
| `inactive` | Ngừng (chỉ Admin đặt) | Không |
| `ended` | Đã kết thúc | Không |

**Kết thúc lớp:** nút **Kết thúc lớp** (`active` → `ended`). Giáo viên **không** đổi status qua dropdown (chỉ Admin).

**Lớp khóa (`inactive` / `ended`):** không thêm/sửa học viên, điểm danh, tiến độ, đánh giá.

**Sĩ số:** tối thiểu khuyến nghị 5, tối đa 15 học viên / lớp.

### Học viên
- Học viên là **master** (dùng chung nhiều lớp). Trong lớp: **enroll** HV có sẵn hoặc **Thêm HV mới** (cần quyền `manage_students`).
- Trạng thái theo enrollment (danh mục): `active` / `reserved` / `dropped` (và các mục Admin/GV được cấp quyền thêm).
- Không enroll trùng cùng HV trong một lớp.

### Danh mục
- Menu **Danh mục** (Admin luôn thấy; Teacher thấy nếu được cấp ≥1 quyền).
- Tab: Chương trình · Khóa học · Học viên master · Trạng thái HV · Mức tiếp thu.
- Mục hệ thống (`is_system`) không xóa được; có thể soft-disable `is_active`.

### Điểm danh
1. Chọn lớp + tháng/năm.
2. Hệ thống tạo buổi theo `days[]` của lớp.
3. Chấm từng học viên bằng dropdown: **Có mặt** / **Có phép** / **Không phép** (không cycle click).
4. Tỷ lệ có mặt = số **có mặt** / số ô **đã chấm** (ô trống không tính).

### Tiến độ học
- Theo từng buổi: bài tập (`done` / `missing`), mức tiếp thu chọn từ danh mục (mặc định: Tốt / Khá / Cần tập trung).

### Đánh giá (mid / final)
- Theo lớp + học viên + tháng/năm + kỳ (`mid` / `final`).
- 4 kỹ năng + nhận xét.

### Tra cứu học viên
- Gõ tên → chọn học viên → xem điểm danh / đánh giá gần đây.

### Thông báo
- Xem thông báo đã gửi, đánh dấu đã đọc.
- Tạo thông báo mới.
- **Thu hồi:** tác giả thu hồi trong **2 giờ** kể từ lúc gửi; Admin thu hồi bất cứ lúc nào.

### Hồ sơ cá nhân
- **Lần 1:** sửa hồ sơ GV trực tiếp (không cần duyệt).
- **Từ lần 2:** gửi yêu cầu → Admin duyệt / từ chối.
- Avatar áp dụng ngay (không qua duyệt).

---

## 3. Vai trò Admin (`admin`)

Admin có **toàn bộ quyền của giáo viên**, cộng thêm:

### Menu thêm
**Thống kê** · **Người dùng** · **Import Excel** · **Danh mục** (đầy đủ)

### Lớp học (quyền mở rộng)
- Xem **mọi lớp** (không chỉ lớp được gán).
- Đổi status: `active` / `inactive` / `ended` (kể cả mở lại lớp đã kết thúc).
- Chỉ Admin đặt lớp sang **Ngừng hoạt động** (`inactive`).

### Người dùng
1. Duyệt tài khoản **pending** → chọn role `admin` hoặc `teacher`.
2. Tạo user mới, khóa (`disabled`), reset mật khẩu.
3. Click tên giáo viên → xem / mở hồ sơ; cấp **Quyền danh mục** (checkbox).
4. Duyệt yêu cầu đổi hồ sơ GV (từ lần sửa thứ 2).

> Không vô hiệu hóa / xóa **admin cuối cùng** trong hệ thống.

### Thống kê
- Lọc theo giáo viên, năm, tháng (đa chọn).
- KPI lớp / học viên theo GV.
- Khi có lọc năm/tháng: thêm số **buổi điểm danh** đã materialize.

### Import Excel
Import workbook theo sheet prototype:
- `01_CLASS` … `05_LOG_NHANXET` (+ cấu hình attendance nếu có)

Dùng khi đưa dữ liệu cũ vào LMS (không migrate Firebase).

### Thông báo
- Thu hồi bất kỳ thông báo nào, không giới hạn 2 giờ.

---

## 4. So sánh nhanh quyền

| Chức năng | Teacher | Admin |
|-----------|:-------:|:-----:|
| Xem lớp được gán | ✅ | ✅ (mọi lớp) |
| Tạo lớp | ✅ (tự gán mình) | ✅ |
| Kết thúc lớp (`ended`) | ✅ | ✅ |
| Đặt `inactive` / mở lại lớp | ❌ | ✅ |
| Quản lý HV / ĐD / Tiến độ / Đánh giá (lớp active) | ✅ | ✅ |
| Danh mục (CRUD theo flag) | Theo quyền cấp | ✅ |
| Tra cứu HV | ✅ | ✅ |
| Thông báo + thu hồi 2h | ✅ | ✅ + thu hồi mọi lúc |
| Hồ sơ: lần 1 tự sửa / lần sau duyệt | ✅ | Duyệt yêu cầu |
| Thống kê / Import Excel | ❌ | ✅ |
| Duyệt user, gán role | ❌ | ✅ |

---

## 5. Gợi ý quy trình hàng ngày (Giáo viên)

1. **Tổng quan** — xem lớp hôm nay và HV nghỉ không phép.
2. **Điểm danh** — chọn lớp + tháng, chấm buổi trong ngày.
3. **Tiến độ** — cập nhật BT về nhà / tiếp thu nếu cần.
4. **Đánh giá** — nhập mid/final theo tháng.
5. **Thông báo** — gửi thông báo lớp / nội bộ khi cần.

## 6. Gợi ý quy trình Admin khi onboard GV mới

1. GV xin quyền → Admin vào **Người dùng** duyệt + gán `teacher`.
2. GV đặt mật khẩu (nếu cần) → đăng nhập.
3. GV tạo lớp hoặc Admin import Excel.
4. Gán thêm TA/GV khác vào lớp nếu cần (qua form sửa lớp khi có field giáo viên).
5. Theo dõi **Thống kê** theo tháng.

---

## 7. Tài khoản mẫu (môi trường dev)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@lms.local` | `admin123` |
| Teacher | `teacher@lms.local` | `teacher123` |

> Chỉ dùng trên local/staging. Đổi mật khẩu khi deploy thật.

---

## 8. Lưu ý kỹ thuật ngắn (cho người vận hành)

- LMS **tách** website public/CMS: tài khoản `lms_users`, không dùng `users` Spatie.
- Lớp `inactive`/`ended` khóa sửa nội dung.
- Filter trên URL (F5 không mất bộ lọc trang).
- CORS chỉ cho phép origin FE LMS.
