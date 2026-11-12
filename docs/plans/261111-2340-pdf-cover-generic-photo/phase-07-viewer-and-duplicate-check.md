# Phase 7: Viewer bỏ lưu ý an toàn + kiểm chứng nguyên liệu trùng

Worker: command-code (deepseek/deepseek-v4.1-flash). Status: pending. Độc lập các phase khác (chỉ file web FE). Thay cho phase "ô nhập lưu ý an toàn" cũ (user chốt 2026-11-12: bỏ hẳn lưu ý an toàn ở web lẫn PDF).

## Context
- Web FE không có ô nhập lưu ý an toàn ở bất kỳ form nào. Chỗ DUY NHẤT web hiển thị: `src/frontend/src/app/(platform)/viewer/recipes/[id]/page.tsx` dòng ~301, khối `{step.notes && <div ...>Lưu ý quan trọng ... {step.notes}</div>}` (`step.notes` là `safetyNote` của bước).
- `src/frontend/src/lib/api/backend-repository.ts` dòng ~192 đọc `item.safetyNote` -> `notes`, dòng ~920 ghi `step.notes` -> `safetyNote`. GIỮ NGUYÊN hai dòng này: dữ liệu cũ đi vòng đọc/ghi, sửa công thức không xoá lưu ý đang có trong DB.
- DB KHÓA, không đổi DTO/API/Swagger. admin_web (Flutter) và mobile nằm ngoài phạm vi.

## Requirements
1. Xoá hẳn khối hiển thị "Lưu ý quan trọng" ở trang Viewer. Không để div rỗng, không chừa khoảng trống. Giữ nguyên các thành phần khác của thẻ bước.
2. Grep toàn `src/frontend/src` các chuỗi `step.notes`, `Lưu ý quan trọng`, `An toàn`, `safetyNote` (trừ trang landing marketing nếu chỉ là chữ quảng bá): báo orchestrator mọi chỗ còn hiển thị lưu ý an toàn của bước; chỉ xoá chỗ hiển thị bước, không đụng mapping.
3. Kiểm chứng nguyên liệu trùng (không sửa code trừ khi hỏng): đọc code cho thấy DB không có unique (recipe_version_id, ingredient_id), backend không chặn trùng, FE không lọc nguyên liệu đã chọn. CHƯA chạy thật. Chạy thật: tạo/sửa công thức, thêm CÙNG nguyên liệu ở 2 dòng với định lượng khác nhau, lưu, mở lại, xem Viewer + PDF: hai dòng phải còn nguyên. Bị chặn hoặc gộp mất dòng ở tầng nào (FE, API, lưu, snapshot, PDF) thì báo orchestrator kèm tầng và lỗi; KHÔNG tự đổi schema, không thêm cảnh báo hay chặn.
4. Form và hiển thị nguyên liệu trên web: KHÔNG sửa ở phase này. Phase 8 (chạy sau) sở hữu việc đổi ô giai đoạn thành Ghi chú, ô chọn nguyên liệu cho từng bước và hiển thị theo bước. Phase 7 chỉ xoá khối "Lưu ý quan trọng" ở Viewer để tránh chồng sửa trang Viewer với phase 8.
5. Tuân `docs/DESIGN.md` (đọc trước), không CSS biệt lập, không dash em/en trong text hiển thị.

## Steps
1. Đọc `AGENTS.md`, `docs/DESIGN.md`; activate `ck:cook`.
2. Sửa Viewer. `npm run build` trong `src/frontend` sạch (typecheck/lint nếu có).
3. Chạy thật mục 3 (cần stack dev; nếu không chạy được, báo rõ phần chưa kiểm chứng).
4. Báo: file sửa, lệnh + exit code thật, kết quả kiểm chứng trùng nguyên liệu, danh sách chỗ còn hiện lưu ý an toàn (nếu có), Status.

## Success criteria
- Viewer không còn "Lưu ý quan trọng" ở bước; bước có `safetyNote` trong DB hiển thị y như bước không có.
- Mở rồi lưu lại công thức có `safetyNote` sẵn: giá trị trong DB còn nguyên (không bị ghi đè rỗng).
- Build FE sạch. Diff chỉ gồm trang Viewer (và file khác chỉ khi báo trước).
