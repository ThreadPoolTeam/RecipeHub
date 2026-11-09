# Frontend 04: Design System & Chuẩn Components

Nguồn chuẩn token, typography, component và accessibility: [`docs/DESIGN.md`](../../DESIGN.md). Figma là thiết kế đích; các primitive hiện hữu được chuyển đổi theo từng phase, không coi việc cập nhật token là đã hoàn thành refactor mọi màn hình.

- Dùng semantic token trong `globals.css` và `tailwind.config.ts`; alias cũ được giữ tạm cho các màn hình chưa chuyển.
- Figtree cho nội dung, Outfit cho tiêu đề; Google Sans local là fallback cho glyph tiếng Việt thiếu.
- Button radius 6px, card/table/dialog radius 8px; không dùng pill button. Search và avatar dùng radius full.
- Trạng thái phải có nhãn rõ, không chỉ dựa vào màu. Component tương tác hỗ trợ bàn phím, focus rõ và `prefers-reduced-motion`.
- Không hiển thị UUID/hash/token nội bộ; chỉ hiển thị mã nghiệp vụ có nghĩa.
- Shell dùng top navigation và drawer theo `docs/DESIGN.md`; các màn chưa refactor vẫn giữ hành vi, quyền và điều hướng hiện có cho đến phase tương ứng.
