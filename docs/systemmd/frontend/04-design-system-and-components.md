# Frontend 04: Design System & Chuẩn Components

Nguồn chuẩn token, typography, component và accessibility: [`docs/DESIGN.md`](../../DESIGN.md) (theo Figma `9gCw3BzwxSGGLt7S1Mcya9`). File này chỉ tóm tắt ranh giới; giá trị cụ thể lấy từ DESIGN.md.

- **Token:** dùng semantic token (`bg-card`, `text-foreground`, `border-border`, `bg-primary`, `bg-secondary`, `text-muted-foreground`, `destructive`, `success`, `info`, `ink`) định nghĩa trong `globals.css`, ánh xạ ở `tailwind.config.ts`. Không hex, không `bg-[#...]`, không file CSS lẻ. Ngoại lệ duy nhất: bộ `--cinematic-*` cho `ScrollFrameStory` ở landing (DESIGN.md mục 8).
- **Font:** Outfit cho tiêu đề, Figtree cho nội dung; Google Sans local (`public/fonts/google-sans-*.woff2`) là fallback cho glyph tiếng Việt mà hai font trên thiếu. Không xóa Google Sans.
- **Badge vai trò:** Admin dùng `ink`/`ink-foreground`, R&D dùng `success-medium`/`success`, Viewer dùng `info-soft`/`info`; badge vai trò bo tròn full, không chấm, gradient dọc nhẹ cùng tông; badge trạng thái giữ nền nhạt theo DESIGN.md mục 5.
- **Role skin:** shell đặt `data-role`; nền trang, accent, density và chiều cao control đọc từ `--role-*` (DESIGN.md mục 2). Admin dùng `primary`, Viewer dùng nền `primary-soft`.
- **Hình dạng:** button radius 6px, không pill; card/table/dialog 8px; search và avatar dùng full. Lucide stroke 1.5.
- **Accessibility:** trạng thái có nhãn, không chỉ dựa vào màu; bàn phím, focus ring và `prefers-reduced-motion` bắt buộc. Sai lệch đã biết: chữ trắng trên `primary` #ED4061 đạt khoảng 3.81:1, giữ theo Figma (DESIGN.md mục 7).
- **Dữ liệu hiển thị:** không UUID/hash/token thô; chỉ mã nghiệp vụ có nghĩa, thiếu dữ liệu thì “Không xác định”/“Chưa cập nhật”.
- **Copy:** không dùng em dash hoặc en dash trong nội dung hiển thị; áp dụng cách diễn đạt tại DESIGN.md mục 3.
- **Shell:** top-nav và drawer, xem [02-layout-and-navigation.md](02-layout-and-navigation.md).
