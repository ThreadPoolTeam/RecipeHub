# Frontend 05: Luồng Dữ Liệu & Quản Lý Trạng Thái

## 1. Kiến Trúc Truy Vấn Dữ Liệu (Data Fetching Pattern)

Frontend tương tác với Backend qua 2 lớp bảo vệ:
1. **Lớp 1: Next.js API Proxy (`/api/backend/[...path]`)**
   - Giấu URL nội bộ của YARP Gateway và các microservices.
   - Xử lý header xác thực (Forwarding Bearer Token / Role Actor header).
2. **Lớp 2: Typed API Repositories (`src/lib/api/`)**
   - Đóng gói toàn bộ logic gọi API thành các hàm bất đồng bộ có kiểu rõ ràng.
   - Tách theo từng phân hệ nghiệp vụ:
     - `quiz-management.ts`: Cho Admin và R&D (tạo đề, sửa câu hỏi, xem kết quả).
     - `quiz-viewer.ts`: Cho Viewer/Barista (lấy đề thi, nộp bài, xem lịch sử).
     - `backend-repository.ts`: Tra cứu công thức, nguyên liệu, media, người dùng.

## 2. Quản Lý Phiên & Quyền (`DemoAuthProvider`)

- Nguồn quản lý: `src/lib/demo/provider.tsx`.
- Cung cấp hook `useDemo()` cho mọi component con:
  ```typescript
  const { session, currentUser, loading, logout, switchRole } = useDemo();
  ```
- **Thông tin Session:**
  - `role`: `'admin' | 'rnd' | 'viewer'`.
  - `email`, `displayName`, `userId`.
- Tự động đồng bộ với `localStorage` để duy trì phiên làm việc khi reload trang.

## 3. Xử Lý Trạng Thái Tải (Loading States)
- Không dùng spinner xoay tròn toàn màn hình đơn điệu nếu không cần thiết.
- Khuyến khích dùng Skeleton Loader bo góc `rounded-xl` màu `#F5F0E8` với hiệu ứng xung nhịp (`animate-pulse`) nhẹ nhàng theo chuẩn Warm Editorial.
- Màn hình chờ chuyển route cấp cao dùng `loading.tsx` tại `(platform)/loading.tsx`.

## 4. Bắt Lỗi & Phản Hồi Người Dùng (Error Handling & Feedback)
- **Error Banner:**
  - Khi API trả về lỗi 400/404/500, hiển thị Banner cảnh báo màu đỏ kem: nền `#FEF2F2`, viền `#FECACA`, icon `AlertTriangle`, chữ đỏ đậm `#991B1B`.
- **Form Validation:**
  - Báo lỗi ngay dưới ô nhập liệu (Inline error text), chữ 12px màu đỏ `#DC2626`.
- **Toast Notifications:**
  - Dùng cho thông báo thành công (Lưu nháp thành công, Nộp bài thi hoàn tất). Nền trắng, viền `#E8E2D9`, icon xanh lục `#166534`.
- **Tuyệt đối cấm:** Để lộ JSON raw lỗi backend hoặc để ứng dụng văng màn hình trắng Unhandled Exception.
