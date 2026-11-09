# RecipeHub Architecture Governance & Checklist

> **CẢNH BÁO QUAN TRỌNG CHO LẬP TRÌNH VIÊN VÀ AI AGENT:**  
> Hệ thống thiết kế chuẩn hóa tại `docs/systemmd/` là Nguồn Sự Thật Duy Nhất (Single Source of Truth) về kiến trúc và giao diện của RecipeHub.  
> **TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ TIỆN:**  
> 1. Viết code phá vỡ cấu trúc layout, tự tạo sidebar/menu dị biệt, tự tạo style CSS phân mảnh làm sai lệch chuẩn tại `docs/DESIGN.md`.
> 2. Đổi mô hình Clean Architecture, tự dùng EF Code First, tự gọi `MigrateAsync` hoặc tự thay đổi schema DB mà không cập nhật tài liệu `docs/database-schema/`.  
> 3. Chỉ cập nhật mục chuẩn liên quan khi có thay đổi chuẩn/kiến trúc hoặc sai lệch đã được đối chiếu; cập nhật cùng commit với code ảnh hưởng. Tính năng tuân thủ chuẩn hiện hữu không cần bổ sung `docs/systemmd/`. Không đưa kế hoạch, nhật ký, kết quả test hay bản sao schema/API/runbook vào bộ chuẩn này; dẫn link nguồn chuyên biệt khi cần.

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
[5. Frontend: Page trong (platform) + WorkspaceShell + components theo DESIGN.md]
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
- [ ] Màn hình workspace nằm trong `src/frontend/src/app/(platform)/`, dùng `WorkspaceShell` và áp dụng đúng quyền vai trò hoặc quyền chung của người đã đăng nhập?
- [ ] Nếu có màn hình cần mục điều hướng mới, đã cập nhật menu đúng vai trò trong `src/frontend/src/components/workspace/nav-config.ts`?
- [ ] Nếu thay đổi quyền truy cập, đã đồng bộ `src/frontend/src/lib/demo/permissions.ts` và kiểm tra quyền phía backend?
- [ ] Giao diện dùng semantic tokens và component theo `docs/DESIGN.md`; alias cũ chỉ dùng tạm trong quá trình chuyển đổi?
- [ ] Số đo định lượng (gram, ml, độ Brix, nhiệt độ) dùng `tabular-nums`?
- [ ] Chuyển động tôn trọng `prefers-reduced-motion`?
- [ ] Đã chạy kiểm tra `npm run build` thành công, không lỗi TypeScript/JSX?

### 2.2. Phía Backend:
- [ ] Có tuân thủ Clean Architecture 4 tầng: `Domain` độc lập -> `Application` -> `Infrastructure` -> `Api`?
- [ ] Có tuân thủ DB First: nếu đổi schema, đã đồng bộ `.dbml`, `.postgres` và SQL tăng dần tại `docs/database-schema/`; nếu không đổi schema, đã đối chiếu mapping hiện hữu?
- [ ] Script migration SQL có viết tối giản, thực dụng, không màu mè triggers/checks rườm rà và bọc transaction khi phù hợp chưa?
- [ ] Có đảm bảo **KHÔNG** dùng EF migrations, không `MigrateAsync` / `EnsureCreated` trong runtime?
- [ ] Route tuân thủ `/api/v1/{service}/*`; chỉ sửa YARP Gateway (`RecipeHub.Gateway/appsettings.json`) nếu route mới chưa được prefix hiện hữu bao phủ?
- [ ] Đã tích hợp Swagger UI và kiểm tra hiển thị đúng schema chưa? (Nhắc lại: CẤM comment XML trong controller).
- [ ] Giao tiếp liên dịch vụ: Dùng gRPC cho truy vấn đồng bộ, dùng Redis Streams `EventEnvelope<T>` cho sự kiện bất đồng bộ?
- [ ] Đã chạy kiểm tra `dotnet build src/backend/RecipeHub.sln` thành công không lỗi?

---

## 3. Cảnh Báo Cho Dev & AI Khi Thay Đổi Chuẩn

- **Nếu thêm một Role mới ngoài 3 role hiện tại:**
  Bắt buộc cập nhật:
  1. `docs/systemmd/frontend/03-roles-and-permissions.md`
  2. `src/frontend/src/components/workspace/nav-config.ts` và `workspace-shell.tsx`
  3. `src/frontend/src/lib/demo/permissions.ts`
  4. Backend `Identity` service và database role seed.
- **Nếu thêm một Service mới:**
  Bắt buộc cập nhật:
  1. `docs/systemmd/backend/02-services-and-boundaries.md`
  2. `docs/database-schema/<new-service>-db/`
  3. `src/backend/Gateway/RecipeHub.Gateway/appsettings.json`
- **Nếu sửa đổi bất kỳ token màu sắc hoặc phong cách giao diện:**
  Bắt buộc thảo luận và cập nhật đồng thời cả `docs/DESIGN.md` và `docs/systemmd/frontend/04-design-system-and-components.md`.
