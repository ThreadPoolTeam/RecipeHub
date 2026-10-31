# RecipeHub Architecture Governance & Checklist

> **CẢNH BÁO QUAN TRỌNG CHO LẬP TRÌNH VIÊN VÀ AI AGENT:**  
> Hệ thống thiết kế chuẩn hóa tại `docs/systemmd/` là Nguồn Sự Thật Duy Nhất (Single Source of Truth) về kiến trúc và giao diện của RecipeHub.  
> **TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ TIỆN:**  
> 1. Viết code phá vỡ cấu trúc layout, tự tạo sidebar/menu dị biệt, tự tạo style CSS phân mảnh làm sai lệch Warm Editorial (`docs/DESIGN.md`).  
> 2. Đổi mô hình Clean Architecture, tự dùng EF Code First, tự gọi `MigrateAsync` hoặc tự thay đổi schema DB mà không cập nhật tài liệu `docs/database-schema/`.  
> 3. Khi có yêu cầu thay đổi chuẩn hoặc kiến trúc, **BẮT BUỘC PHẢI CẬP NHẬT TÀI LIỆU NÀY TRONG CÙNG COMMIT** với code thay đổi.

---

## 1. Quy Trình Phát Triển Tính Năng Mới (Step-by-Step Flow)

```text
[1. Đọc Chuẩn docs/systemmd/]
       |
       v
[2. Đối Chiếu Vai Trò (Admin / R&D / Viewer)]
       |
       v
[3. Thiết Kế DB First (Nếu có đổi schema: cập nhật .dbml & .postgres)]
       |
       v
[4. Backend: Clean Architecture 4 Layer + Swagger + YARP Route]
       |
       v
[5. Frontend: Page trong (platform) + WorkspaceShell + Warm Editorial Components]
       |
       v
[6. Verify: dotnet build + npm run build]
       |
       v
[7. Cập Nhật Tài Liệu docs/systemmd/ nếu có mở rộng chuẩn]
```

---

## 2. Checklist Bắt Buộc Trước Khi Hoàn Thành (Definition of Done)

### 2.1. Phía Frontend:
- [ ] Màn hình có thuộc 1 trong 3 role (`admin`, `rnd`, `viewer`) và nằm trong `src/frontend/src/app/(platform)/` không?
- [ ] Đã thêm đường dẫn vào menu tương ứng trong `src/frontend/src/components/workspace/workspace-shell.tsx` chưa?
- [ ] Đã đăng ký quyền trong `src/frontend/src/lib/demo/permissions.ts` chưa?
- [ ] Giao diện có dùng đúng Semantic Color Tokens: Canvas `#FAF9F5`, Surface `#FFFFFF`, viền `#E8E2D9`, nút bấm `#B47820`?
- [ ] Nút bấm có bo góc viên thuốc `rounded-full` và hiệu ứng `active:scale-[0.98]` không?
- [ ] Bảng dữ liệu có dùng `DataTable` bo góc `rounded-2xl` viền hairline không?
- [ ] Số đo định lượng (gram, ml, độ brix) có dùng font monospace kèm `tabular-nums` không?
- [ ] Nội dung view có animation `animate-workspace-enter` khi chuyển trang không?
- [ ] Đã chạy kiểm tra `npm run build` thành công, không lỗi TypeScript/JSX?

### 2.2. Phía Backend:
- [ ] Có tuân thủ Clean Architecture 4 tầng: `Domain` độc lập -> `Application` -> `Infrastructure` -> `Api`?
- [ ] Có tuân thủ DB First: Đã cập nhật file `.dbml`, `.postgres` hoặc script trong `migrations/` tại `docs/database-schema/` chưa?
- [ ] Có đảm bảo **KHÔNG** dùng EF migrations, không `MigrateAsync` / `EnsureCreated` trong runtime?
- [ ] Đã đăng ký route mới trong YARP Gateway (`RecipeHub.Gateway/appsettings.json`) theo chuẩn `/api/v1/{service}/*` chưa?
- [ ] Đã tích hợp Swagger UI và kiểm tra hiển thị đúng schema chưa? (Nhắc lại: CẤM comment XML trong controller).
- [ ] Giao tiếp liên dịch vụ: Dùng gRPC cho truy vấn đồng bộ, dùng Redis Streams `EventEnvelope<T>` cho sự kiện bất đồng bộ?
- [ ] Đã chạy kiểm tra `dotnet build src/backend/RecipeHub.sln` thành công không lỗi?

---

## 3. Cảnh Báo Cho Dev & AI Khi Thay Đổi Chuẩn

- **Nếu thêm một Role mới ngoài 3 role hiện tại:**
  Bắt buộc cập nhật:
  1. `docs/systemmd/frontend/03-roles-and-permissions.md`
  2. `src/frontend/src/components/workspace/workspace-shell.tsx`
  3. `src/frontend/src/lib/demo/permissions.ts`
  4. Backend `Identity` service và database role seed.
- **Nếu thêm một Service mới:**
  Bắt buộc cập nhật:
  1. `docs/systemmd/backend/02-services-and-boundaries.md`
  2. `docs/database-schema/<new-service>-db/`
  3. `src/backend/Gateway/RecipeHub.Gateway/appsettings.json`
- **Nếu sửa đổi bất kỳ token màu sắc hoặc phong cách giao diện:**
  Bắt buộc thảo luận và cập nhật đồng thời cả `docs/DESIGN.md` và `docs/systemmd/frontend/04-design-system-and-components.md`.
