# Round 3 — reviewer fixes

## Thay đổi
- CTA dùng `cta-banner-raw.jpg`, xóa `cta-banner.jpg` đã hết tham chiếu. Gradient dùng token ink với opacity 80% đến 50%, giữ ảnh nhìn thấy và chữ HTML rõ; banner đo được 1280×280px. Theo DESIGN.md mục 2, 4 và 7: token ngữ nghĩa, radius 2xl, nội dung và focus có thể truy cập.
- Điều chỉnh khoảng cách desktop và đáy CTA 96px. Ở viewport 1440px, browser đo các section bắt đầu tại y=81, 741, 1103, 1689, 1953; banner cao 280px, page cao 2329px. Ảnh chụp có kích thước 1440×2328px do làm tròn. Các mốc trong sai số 4px so với brief. Feature card giữ chiều cao đồng đều như brief cho phép.
- `StatusBadge` thêm tùy chọn dot cho landing; mặc định tiếp tục dùng check ở các màn hình khác. Theo DESIGN.md mục 5, badge có nhãn và chấm.
- Badge vai trò dùng nền solid `ink`, `success`, `info` cùng chữ `ink-foreground`; badge trạng thái không đổi. Tương phản tính theo token: Admin 15.71:1, R&D 6.67:1, Viewer 6.36:1, đều đạt AA chữ thường. DESIGN.md mục 2, 5 và 7: dùng token sẵn có, nhãn không phụ thuộc màu. Đã đồng bộ mô tả badge trong DESIGN.md và systemmd/frontend/04; không thay đổi kiến trúc, route, quyền hay schema.

## Kiểm chứng
- `npx tsc --noEmit`: đạt.
- `npm run build`: đạt; 31/31 static pages.
- `npx eslint` các file landing và `status-badge.tsx` đã sửa: đạt; hai file điều chỉnh khoảng cách và CTA được lint lại sau lần sửa cuối.
- `dotnet build src/backend/RecipeHub.sln --no-restore`: đạt.
- Browser bản production local: kiểm tra gradient thực tế, kích thước và ảnh landing; đăng nhập demo và kiểm tra màu badge `/admin/users`. Ảnh: `landing-after.png`, `admin-feedback-users.png`.
- Không chạy lại lint toàn frontend: brief chỉ yêu cầu file sửa; lỗi `react-hooks/set-state-in-effect` tại `admin/logs/page.tsx` đã được reviewer ghi nhận là tồn tại ở HEAD. Giới hạn contrast chữ trắng trên primary khoảng 3.81:1 vẫn theo DESIGN.md mục 7.

Status: DONE_WITH_CONCERNS
ROUND3_COMPLETE
