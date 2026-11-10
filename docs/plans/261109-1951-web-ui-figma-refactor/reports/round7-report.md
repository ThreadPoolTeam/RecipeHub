# Round 7 — hồ sơ cá nhân

- Giả định theo yêu cầu: sửa họ tên trực tiếp trong input, dùng nút Lưu primary và icon Save; bỏ dialog và link workspace cho mọi vai trò. Email/vai trò chỉ đọc. Giữ `repo.updateProfile`, `refresh` và Alert thành công/lỗi.
- Nút Lưu disabled khi tên không đổi hoặc sau trim ngoài 2–100 ký tự; dùng trạng thái loading của Button. Input, nút, focus và thông báo dùng component/token theo DESIGN.md mục 5 và 7; không hiển thị ID.
- `npx tsc --noEmit`, `npx eslint "src/app/(platform)/profile/page.tsx"`, `npm run build`: đạt.
- Browser bản production `/profile`: input tên sửa được, email/vai trò readOnly; tên một ký tự disabled, tên hợp lệ bật Lưu. Ảnh `round7-profile.png`. Không gửi thay đổi tên thật để tránh sửa tài khoản demo; luồng API thành công/lỗi chưa chạy thực tế.

Status: DONE_WITH_CONCERNS
ROUND7_COMPLETE
