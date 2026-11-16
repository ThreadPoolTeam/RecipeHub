# Brainstorm: AI tự sinh công thức + Size ly

Trạng thái: GHI NHẬN Ý TƯỞNG, chưa có quyết định. Chưa thiết kế, chưa code.
Ngày: 2026-11-15

## Phần 1 — AI tự sinh công thức từ tên món

Ý người dùng (nguyên văn tóm tắt):
- Chỉ nhập **tên món** → AI tự sinh toàn bộ: nguyên liệu, định lượng, các bước, v.v.
- Kết quả phải **đạt chuẩn công thức quán** (chuẩn chuỗi đồ uống).
- Có thể cần **nhiều phương án** (chưa rõ bao nhiêu / dạng nào).
- Làm **song song** với phần size ly.

Lưu ý ràng buộc hiện hữu (AGENTS.md):
- "AI/Gemini trợ lý thiết kế công thức" đang nằm trong **Deferred Scope** → cần user xác nhận đưa vào scope chính thức trước khi plan.
- Không dính pipeline ảnh Content (FLUX) hiện hữu; nếu dùng Gemini phải tách khỏi prompt translator ảnh.
- Đọc `docs/systemmd/governance.md` + `docs/DESIGN.md` trước khi thiết kế.

Câu hỏi mở:
1. "Chuẩn công thức quán" = chuẩn nào? Có tài liệu/công thức mẫu của quán để làm few-shot/RAG không?
2. Output AI là **bản nháp** (R&D sửa rồi duyệt) hay lưu thẳng? (đề xuất: luôn là Draft)
3. "Nhiều phương án" = nhiều biến thể 1 món (ngọt/ít ngọt, đá/nóng) hay nhiều cách pha khác nhau để chọn?
4. Nguyên liệu AI đề xuất phải map vào **kho nguyên liệu có sẵn** hay được tạo mới?
5. Định lượng/giá vốn: AI có tính không? (công thức tính phức tạp đang deferred)
6. Provider: Gemini (đã có key?) / model nào / chi phí / giới hạn rate?
7. Ai được dùng: chỉ R&D? Có audit log mỗi lần gen?
8. Ngôn ngữ đầu ra: Việt; tên nguyên liệu khớp danh mục tiếng Việt.
9. Cách kiểm tra "đạt chuẩn": validate schema, bắt buộc đủ field, so với công thức tương tự trong DB?

## Phần 2 — Bổ sung size ly

Ý người dùng:
- Thêm khái niệm **size ly** (S/M/L…?) vào hệ thống.
- "Khá nhiều vấn đề", **đang cần thêm bối cảnh** → chưa chốt gì.

Câu hỏi mở (cần bối cảnh từ user):
1. Size gắn ở đâu: công thức, biến thể công thức, hay sản phẩm bán?
2. Mỗi size = **công thức riêng** hay **hệ số nhân** từ công thức gốc?
3. Có size nào không scale tuyến tính (đá, espresso shot, đường)? Quy tắc làm tròn?
4. Danh sách size cố định hay cấu hình theo quán (ml/oz)?
5. Ảnh hưởng: DB Recipe (cần SQL migration, DB First), PDF xuất, mobile Viewer (barista xem đúng size), Quiz.
6. Công thức hiện có (dữ liệu cũ) xử lý ra sao: mặc định 1 size?

## Liên hệ giữa 2 phần
- AI gen nên biết size để sinh định lượng theo từng size → **size cần chốt mô hình dữ liệu trước hoặc cùng lúc**. Rủi ro: gen xong rồi đổi schema size phải làm lại.

## Bước tiếp theo
- User cung cấp bối cảnh size + chuẩn công thức quán.
- Chốt scope (đưa AI khỏi Deferred), chọn mode plan (đề xuất `--hard`/`--parallel`).
- Sau đó mới research, đọc `docs/database-schema/recipe-db/`, lập plan.md.

## Phát hiện từ "Bộ công thức Phê La 13_07_2026" (đọc 2026-11-15, chưa đọc 156 dòng giữa)

- Mỗi thẻ pha chế: bảng Thành phần theo cột size (Phê (M) ly giấy 16oz | La (L) ly giấy 22oz), bước dùng chung, mục Phục vụ, Yêu cầu đặc biệt, Chú ý độ ngọt, Thời gian hoàn thành, nhãn thiết bị (Syphon/Moka Pot/Cold Brew/Phin).
- Tập size KHÁC nhau theo món: có món chỉ size La, chỉ Phê, hoặc ly nhựa 14oz. Size = thuộc tính theo công thức, không phải danh sách cố định toàn hệ thống. Size gồm tên + loại/dung tích ly.
- Định lượng KHÔNG tuyến tính: bột sữa 22.5→28gr (x1.24), HHSD 55→70, đường nước 6→9 (x1.5), 2→2.5 (x1.25). Hệ số nhân vô dụng; phải lưu giá trị từng size.
- Ô định lượng không luôn là số: "141gr (105gr + 35ml: zic cắt)", "Ngang miệng 1 cốc + ½ cốc (cốc 200ml)", "Tùy theo sản phẩm...". Cần số có cấu trúc + chuỗi hiển thị.
- Khác biệt theo size nằm trong bước/ghi chú: "(Size La cách đáy 2cm)", đá "1 cốc" vs "1 cốc + ½", sữa đặc 0% đường: 25gr (Phê) / 40gr (La).
- Bảng độ ngọt: ma trận % đường (120/100/70/50/30) x size -> lượng HHSD. Chiều thứ hai ngoài size; chưa quyết có đưa vào scope.
- Chiều thứ ba: số ly mỗi mẻ xay (1 ly / 2 ly / 3 ly) và thiết bị (HBH 850 vs 855 là 2 thẻ riêng, thời gian xay khác).
- Bảng đá chung theo nhóm món x mức đá (100/70/50/30%), tách theo ly nhựa/ly giấy.
