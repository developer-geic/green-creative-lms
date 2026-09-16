# LMS Sáng Tạo Xanh (nội bộ)

Frontend Next.js tách biệt website public. Chỉ gọi API `/api/v1/lms/*`.

## Hướng dẫn sử dụng theo role

Xem [docs/USER_GUIDE.md](./docs/USER_GUIDE.md) — đăng nhập, quyền **Admin** / **Teacher**, quy trình hàng ngày.

## Dev

```bash
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8880/api/v1
# NEXTAUTH_URL=http://localhost:3001
npm run dev -- -p 3001
```

Backend (trong `green-creative-be/backend`):

```bash
php artisan migrate
php artisan lms:passport-client
# copy PASSPORT_LMS_CLIENT_ID/SECRET vào .env
php artisan db:seed --class=LmsUserSeeder
```

Tài khoản mẫu: `admin@lms.local` / `admin123`, `teacher@lms.local` / `teacher123`.

## Production

- Subdomain FE: `lms.sangtaoxanh.edu.vn`
- API: `https://api.sangtaoxanh.edu.vn/api/v1/lms`
- Thêm origin LMS vào `CORS_ALLOWED_ORIGINS`
- Nginx proxy FE container `fe-lms-sangtaoxanh:3000`
