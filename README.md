# HomuLearn

Nền tảng hỗ trợ học tập và cộng đồng dành cho sinh viên: quản lý ghi chú theo thư mục, ôn tập Flashcards (Spaced Repetition), đặt mục tiêu học tập, đồng hồ Pomodoro, thảo luận cộng đồng, nhóm học trực tuyến và quản trị hệ thống.

## Công nghệ sử dụng

- **Frontend:** React, Vite, Material UI (MUI), Redux Toolkit, React Router
- **Backend:** Java 21, Spring Boot 4.1.0, Spring Security (Session Cookie `HttpOnly` + CSRF), Spring Data JPA, Flyway
- **Database:** PostgreSQL 17
- **Kiểm thử & CI/CD:** JUnit 5 + MockMvc, Vitest, Playwright E2E, GitHub Actions, Docker

## Tính năng chính

- **Tài khoản & Hồ sơ cá nhân:** Đăng ký, đăng nhập/đăng xuất bằng session cookie, cập nhật hồ sơ (`fullName`, ngành/khoa, khóa, giới thiệu ngắn, màu avatar) và đổi mật khẩu.
- **Ghi chú & Thư mục:** Tạo/sửa/xóa thư mục kèm icon và ghi chú thư mục; tạo/sửa/xóa ghi chú (trong thư mục hoặc độc lập ngoài thư mục), tìm kiếm nhanh và kiểm tra quyền sở hữu ở backend.
- **Ôn tập (Flashcards):** Tạo bộ thẻ (deck), thêm thẻ 2 mặt và ôn tập theo chu kỳ Spaced Repetition.
- **Mục tiêu & Pomodoro:** Đặt mục tiêu học tập, cập nhật tiến độ, chạy đồng hồ Pomodoro và lưu lịch sử phiên học lên bảng tổng quan (Dashboard).
- **Cộng đồng:** Đăng bài, sửa/xóa bài, bình luận, thả cảm xúc (Reaction), lưu bài viết (Bookmark), báo cáo vi phạm (Report) và tìm kiếm có phân trang.
- **Nhóm học & Nhắn tin:** Tạo nhóm công khai/riêng tư, tham gia/rời/xóa nhóm theo quyền chủ nhóm/thành viên; nhắn tin theo thời gian thực (polling), tải tin nhắn cũ hơn theo cursor (`beforeId`), tìm kiếm tin nhắn và chống gửi trùng khi mạng chập chờn (`clientMessageId`).
- **Quản trị (Admin):** Thống kê tổng quan, khóa/mở khóa tài khoản, duyệt & xóa bài viết vi phạm, xử lý báo cáo và ghi nhật ký kiểm toán (`admin_audit_logs`).

## Yêu cầu môi trường (Local)

- **JDK 21**
- **Node.js 20+** & `npm`
- **Docker Desktop** (hoặc PostgreSQL 17 chạy cục bộ)

## Hướng dẫn chạy ở máy cá nhân

### 1. Khởi động PostgreSQL bằng Docker

```powershell
cd backend/homulearn
docker compose -f compose.local.yaml up -d
```

Sao chép file cấu hình mẫu và điền thông tin kết nối DB cục bộ (file `.env` đã được Git bỏ qua, tuyệt đối không commit lên repo):

```powershell
copy backend/homulearn/.env.example backend/homulearn/.env
```

*(File `.env` dùng định dạng `KEY=value`, không bọc dấu ngoặc kép; Spring Boot sẽ tự nạp khi chạy từ thư mục `backend/homulearn`.)*

### 2. Chạy Backend (cổng `8080`)

```powershell
cd backend/homulearn
.\gradlew.bat bootRun
```

Flyway sẽ tự động chạy các migration từ `V1` đến `V10` khi khởi động lần đầu.

### 3. Chạy Frontend (cổng `5174`)

Mở một terminal khác:

```powershell
cd frontend
npm ci
npm run dev
```

Truy cập `http://localhost:5174`. Vite tự động proxy các request `/api` sang backend tại `http://localhost:8080`.

## Kiểm thử (Testing)

> Lưu ý: Nên tách riêng database test (`homulearn_test`) khỏi database dev (`homulearn_dev`) để tránh ảnh hưởng dữ liệu đang dùng thử.

- **Backend (JUnit + MockMvc trên PostgreSQL test):**

  ```powershell
  cd backend/homulearn
  .\gradlew.bat test
  ```

- **Frontend (Vitest + Production Build):**

  ```powershell
  cd frontend
  npm test -- --run
  npm run build
  ```

- **End-to-End (Playwright):**

  ```powershell
  cd frontend
  npx playwright install chromium
  npm run test:e2e
  ```

## CI/CD & Đóng gói Docker

- **GitHub Actions (`.github/workflows/ci.yml`):** Tự động chạy kiểm tra file nhạy cảm, chạy test backend cùng PostgreSQL 17, đóng gói `bootJar`, chạy test frontend và build production mỗi khi push lên `main` hoặc nhánh `feature/**`.
- **Docker Backend (`backend/homulearn/Dockerfile`):** Build multi-stage từ JDK 21 sang JRE 21 Alpine để triển khai lên các nền tảng hỗ trợ container.

## Sao lưu & Khôi phục Database (Tham khảo)

```powershell
# Sao lưu DB local ra file .sql
docker exec homulearn-local-postgres-1 pg_dump -U homulearn homulearn_dev > backup.sql

# Khôi phục từ file .sql
Get-Content backup.sql | docker exec -i homulearn-local-postgres-1 psql -U homulearn homulearn_dev
```
