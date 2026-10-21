# Recipe Domain Simplification

## Phạm vi

Chỉ thay đổi Recipe Service, tài liệu schema `recipe_db` và các màn hình frontend trực tiếp sử dụng Recipe API. Không thay đổi Content, Identity, Audit, Gateway hoặc Worker.

## Kết quả

- Bỏ người duyệt và toàn bộ review workflow.
- Rút trạng thái phiên bản còn `draft` và `published`.
- Dùng `archived_at` thay cho state lưu trữ trùng lặp.
- Bỏ quan hệ clone, variant và revision; thay bằng thao tác copy độc lập.
- Giữ lịch sử phiên bản đã publish; chỉnh sửa bản đã publish tạo draft mới.
- Recipe editor dùng full aggregate update, server tự gán thứ tự nguyên liệu, bước và media.
- Cho phép lưu draft chưa hoàn chỉnh; chỉ kiểm tra nội dung bắt buộc khi publish.
- Giữ `IngredientCategory` và `UnitCategory` để phân loại.
- Bỏ base unit và phép quy đổi tự động khỏi MVP.
- Form tạo/sửa nguyên liệu lấy category và unit thật từ Recipe API, không dùng danh sách hard-code.
- Frontend chỉ còn trạng thái `Draft`, `Published`, `Archived`; bỏ route, menu, quyền và giao diện phê duyệt.
- Nút `Phát hành` gọi đúng API publish; công thức đã phát hành có thể mở editor để backend tạo draft kế tiếp.
- Đổi thao tác variant/clone thành `Sao chép` một công thức độc lập.
- Adapter giữ nguyên yield nullable và primary media khi lưu, không tự tạo sản lượng giả hoặc xóa ảnh.
- Adapter nguyên liệu giữ riêng description, note và image; tạo nguyên liệu không kích hoạt sẽ ngừng sử dụng ngay sau khi tạo.
- Thêm migration `20261019_simplify_recipe_domain.sql`.

## Xác minh

- `dotnet build src/backend/RecipeHub.sln --no-restore -m:1`: thành công, 0 warning, 0 error.
- `dotnet test tests/RecipeHub.UnitTests/RecipeHub.UnitTests.csproj --no-build -m:1`: 5/5 test thành công.
- `git -c core.whitespace=cr-at-eol diff --check`: thành công.
- `npx --no-install tsc --noEmit`: thành công.
- Route types của Next.js được tạo lại sau khi xóa `/approvals`: thành công.
- `npm run build` không hoàn tất vì Turbopack không được phép bind cổng trong môi trường chạy.
