# Phase 1: HUỶ (user chốt 2026-11-12 dùng nền tối vector, không dùng ảnh). Không làm.

Worker: none. Status: CANCELLED. Thợ ảnh từng chạy một lần và BLOCKED do Gemini hết quota (429); không có file ảnh nào được tạo.

## Overview
Tạo 3 ảnh ứng viên để user chọn một. Chưa đặt vào Assets cho tới khi user chọn.

## Requirements
- Tỉ lệ A4 ngang (1.414), xuất 2400x1697, JPEG chất lượng ~80, mỗi file <= 350 KB.
- Cảnh quán cà phê quán nước Việt: phin nhôm hoặc ly cà phê sữa đá trên bàn gỗ, ánh nắng chiều qua cửa sổ, nền bokeh ấm, có thể thấp thoáng gạch bông.
- Bố cục: chủ thể ở phần trên và bên phải; nửa dưới bên trái tối, ít chi tiết để chữ trắng đọc được.
- Mô tả khẳng định (Positive Framing). Cảnh chung: không món cụ thể nào dùng làm chủ thể độc nhất; không có người, chữ, logo, thương hiệu trong ảnh.
- Gam: nâu cà phê, hổ phách, chút đỏ rượu gần #C4355B.

## Steps
1. Đọc `AGENTS.md`, activate `ai-multimodal`.
2. Tạo 3 ảnh khác ý tưởng (phin nhỏ giọt, ly cà phê sữa đá, cảnh bàn gỗ + đèn). Lưu vào `docs/plans/261111-2340-pdf-cover-generic-photo/candidates/` tên `cover-1.jpg..cover-3.jpg`.
3. Ghi `candidates/README.md` ngắn: prompt, model, kích thước từng ảnh.
4. Dừng, báo orchestrator. Không sửa file ngoài thư mục candidates.

## Success criteria
- 3 file thật mở được, đúng kích thước, đúng tỉ lệ, dung lượng <= 350 KB.
- Không có chữ/logo/người trong ảnh (orchestrator xem từng ảnh).

## Blocked path
Không có API/key ảnh: báo BLOCKED + lỗi nguyên văn, không tạo ảnh giả hay ảnh stock tải bừa.

## Next
User chọn ảnh -> orchestrator chép thành `Documents/Assets/cover-background.jpg` (nhúng assembly, đã có `EmbeddedResource Include="Documents\Assets\**\*"`).
