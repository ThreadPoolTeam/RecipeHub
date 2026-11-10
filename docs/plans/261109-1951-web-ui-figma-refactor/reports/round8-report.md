# Round 8: copy không dùng em dash và en dash

- Đổi câu, khoảng số, bộ lọc ngày, metadata, footer và nội dung landing; thống nhất mã và tên bằng `·`.
- Đổi giá trị trống thành “Chưa cập nhật”; ký hiệu câu bỏ trống và chú giải cùng dùng `•`. Đổi tiêu đề mẫu PDF. Giữ nguyên logic và dữ liệu API.
- Bổ sung quy tắc copy tại `docs/DESIGN.md` và `docs/systemmd/frontend/04-design-system-and-components.md`. Tìm `[—–]` trong `src/frontend/src`: không còn kết quả; không giữ ngoại lệ trong source.
- `npx tsc --noEmit`: đạt. `npm run build`: đạt sau khi dừng server thử nghiệm; lần đầu lỗi Windows paging file khi tải SWC. `dotnet build src/backend/RecipeHub.sln --no-restore`: đạt.
- ESLint các file sửa: không đạt, 16 lỗi và 9 cảnh báo tại logic/hooks có sẵn, ngoài phạm vi thay copy; gồm `react-hooks/set-state-in-effect` và `react-hooks/refs`. Không sửa logic để vượt lint.
- Browser production: kiểm tra `/admin/logs` và `/rnd/recipes`; ảnh `round8-admin-logs.png`, `round8-rnd-recipes.png`.

ROUND8_COMPLETE
