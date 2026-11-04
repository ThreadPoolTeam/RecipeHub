# Warm Editorial UI — planning

## Context

Người dùng chọn cinematic tối ở đầu landing, editorial kem ở phần dưới; giữ story hiện tại, sửa navbar. Yêu cầu gốc đổi UI tất cả trang, sau đó yêu cầu plan trước khi sửa DESIGN.md/code.

## Đã thực hiện

- Viết [plan và ba phase](../plans/261019-warm-editorial-ui/plan.md), status pending.
- Scan bốn plan cũ; ghi chú supersession hai chiều với cinematic landing và frontend role flows. Không tạo blockers giả từ status pending lịch sử.
- Plan bao phủ 22 page routes hiện có, shared component states và browser acceptance. Đặt DESIGN.md làm bước đầu implementation, chưa thay file quy chuẩn trong lượt planning.
- Kiểm tra bằng script: 4 file plan, 0 relative link hỏng, 22/22 route có trong checklist.

## Quyết định và sửa nhận định

- Navbar đổi tone theo boundary cinematic/light, không dùng scrollY >40 làm điều kiện màu.
- Tách accent thương hiệu khỏi màu nút cần tương phản; đo contrast thực tế khi triển khai.
- App đang có Google Sans Vietnamese local; không khẳng định lỗi screenshot do Georgia/Windows và không hứa font không bao giờ lỗi.
- Mockup chỉ là preview; không phải app đã triển khai, ảnh AI thật hay bằng chứng đạt 60fps.
- Không sửa nghiệp vụ PR #5, không thêm dependency hoặc hứa tự động phát hành SOP trong landing copy.

## Giới hạn / Next

Không chạy build/browser vì chỉ thay tài liệu; chưa xác nhận UI pass. `ck` CLI không có trong PATH. Active-plan helper chạy nhưng báo `CK_SESSION_ID not set`, nên không lưu active state; dùng absolute plan path khi handoff. Bước tiếp theo là thực thi phase 1 theo yêu cầu riêng; không tự code trong lượt planning.
