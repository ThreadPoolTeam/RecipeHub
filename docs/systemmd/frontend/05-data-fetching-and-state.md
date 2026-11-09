# Frontend 05: Luồng Dữ Liệu & Quản Lý Trạng Thái

## 1. Kiến Trúc Truy Vấn Dữ Liệu (Data Fetching Pattern)

Frontend tương tác với Backend qua 2 lớp bảo vệ:
1. **Lớp 1: Next.js API Proxy (`/api/backend/[...path]`)**
   - Giấu URL nội bộ của YARP Gateway và các microservices.
   - Forward Bearer token; backend không dùng role/actor header phía client làm nguồn quyền.
2. **Lớp 2: Typed API Repositories (`src/lib/api/`)**
   - Đóng gói toàn bộ logic gọi API thành các hàm bất đồng bộ có kiểu rõ ràng.
   - Tách theo từng phân hệ nghiệp vụ:
     - `quiz-management.ts`: Cho Admin và R&D (tạo đề, sửa câu hỏi, xem kết quả).
     - `quiz-viewer.ts`: Cho Viewer/Barista (lấy đề thi, nộp bài, xem lịch sử).
     - `backend-repository.ts`: Tra cứu công thức, nguyên liệu, media, người dùng.
     - `pdf-documents.ts`: Quản lý xem trước (`preview`), xuất bản (`export`), tra cứu lịch sử (`history`) và tải tệp PDF nhị phân (`requestBinary`).
     - `audit.ts`: Tra cứu nhật ký kiểm toán hệ thống (`listAuditLogs`), lọc đa chiều và phân trang.

## 2. Quản Lý Phiên & Quyền (`DemoProvider`)

- Nguồn quản lý: `src/lib/demo/provider.tsx`.
- Cung cấp hook `useDemo()` cho mọi component con:
  ```typescript
  const { session, currentUser, loading, logout, refresh } = useDemo();
  ```
- **Thông tin Session:**
  - `role`: `'admin' | 'rnd' | 'viewer'`.
  - `email`, `fullName`, `userId`, access/refresh token và thời hạn.
- Lưu phiên bằng `sessionStorage`; reload cùng tab giữ phiên còn hạn. `DemoProvider` kiểm tra lại user với backend, không cung cấp thao tác đổi role phía client.

### 2.1. Quản Lý Tệp Nhị Phân & Vòng Đời Blob (PDF Preview / Download)
- Dữ liệu xem trước và file tải về từ backend được nhận dưới dạng `Blob` kèm response headers (`X-Pdf-Snapshot-Hash`) thông qua `requestBinary`.
- Tuyệt đối không lưu trữ file nhị phân PDF vào `localStorage` hay `IndexedDB` của trình duyệt.
- Quản lý vòng đời URL trong bộ nhớ client:
  - Tạo URL tạm: `const url = URL.createObjectURL(blob)`.
  - Bắt buộc thu hồi bộ nhớ: `URL.revokeObjectURL(url)` khi người dùng đóng modal xem trước, thay đổi bản xem trước mới hoặc component unmount.

- **Phát hiện Stale Preview:**
  - Khi người dùng điều chỉnh danh sách công thức, tiêu đề, loại tài liệu hoặc phạm vi xuất bản sau khi đã tạo preview, giao diện tự động đánh dấu bản xem trước là "lỗi thời" (stale), vô hiệu hóa thao tác xuất bản chính thức và nhắc nhở người dùng nhấn tạo lại preview để bảo đảm snapshot hash luôn khớp với nội dung thực tế.
## 3. Xử Lý Trạng Thái Tải (Loading States)
- Không dùng spinner xoay tròn toàn màn hình đơn điệu nếu không cần thiết.
- Skeleton mô phỏng nội dung thực: `rounded-lg bg-secondary`, `motion-safe:animate-pulse`.
- Màn hình chờ chuyển route cấp cao dùng `loading.tsx` tại `(platform)/loading.tsx`.

## 4. Bắt Lỗi & Phản Hồi Người Dùng (Error Handling & Feedback)
- **Error Banner:**
  - Khi API trả về lỗi 400/404/500, hiển thị banner `border-destructive-border bg-destructive-tint text-destructive` kèm icon và cách xử lý.
- **Form Validation:**
  - Báo lỗi ngay dưới ô nhập liệu (inline error), chữ 12px `text-destructive`.
- **Toast Notifications:**
  - Dùng cho thông báo thành công (Lưu nháp thành công, Nộp bài thi hoàn tất): nền `bg-card`, viền `border-border`, icon `text-success`; chi tiết ở DESIGN.md mục 5.
- **Tuyệt đối cấm:** Để lộ JSON raw lỗi backend hoặc để ứng dụng văng màn hình trắng Unhandled Exception.
