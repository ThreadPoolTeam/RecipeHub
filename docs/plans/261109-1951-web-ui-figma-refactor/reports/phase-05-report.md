# Phase 05 — R&D ingredients, catalogue, media, PDF, quiz

## Kết quả

- Ingredients: lưới bốn cột, tab loại nguyên liệu giữ panel cũ; form tạo/sửa chia section và preview từ giá trị đang nhập. API hiện dùng không cung cấp ảnh/cảnh báo cho form, không thêm điều khiển giả.
- Catalogue: danh sách đại lượng, panel đơn vị và quy đổi nhanh; selection dùng state trình bày để không mất lựa chọn khi panel unmount. Giữ API quy đổi và CRUD hiện hữu.
- Media: lưới, dropzone, panel chi tiết; giữ upload, AI draft và kiểm tra quyền. Tên thiếu được hiển thị `Chưa cập nhật`, không lộ ID.
- PDF: workspace ba vùng, thư viện và preview. Giữ revoke Blob URL khi đóng/thay/unmount, header `X-Pdf-Snapshot-Hash`, không lưu Blob; nút xuất chính thức bị khóa khi preview stale. PDF do backend render.
- Quiz management: thay markup bằng token, editor ba cột, kết quả dạng thẻ, giữ role-check; đã xóa `management-styles.css`, import và toàn bộ class `qm-*` trong `src/frontend/src`.
- Giao diện dùng semantic tokens, `font-display`, spacing/grid responsive và primitive hiện có theo `docs/DESIGN.md`; không thêm CSS riêng. Nội dung/ảnh/thống kê không có trong API không được bịa.

## Đối chiếu logic

| File | useState trước/sau | useEffect trước/sau | Handler trước/sau | API trước/sau |
|---|---:|---:|---:|---:|
| `pdf-document-workspace` | 18/18 | 4/4 | `handle*` 7/7 | `repo` 3/3; capabilities 1/1, preview 2/2, export 1/1 |
| `media-library` | 14/14 | 1/1 | `handle*` 4/4; thêm adapter UI drop | `repo` 9/9 |
| `management-results` | 16/16 | 4/4 | JSX 6/7, thêm adapter phân trang | quiz 3/3, repo 2/2 |
| `management-editor` | 13/13 | 2/2 | named 5/5; JSX 25/25 | quiz 7/7 |

Đối chiếu diff và review tĩnh: giữ role-check, handler nghiệp vụ, request và thứ tự hiện hữu. Bổ sung điều kiện khóa nút xuất chính thức khi stale theo chỉ đạo; không thay handler export. Catalogue bổ sung state chọn panel, không thay state nghiệp vụ.

## Kiểm chứng

- Mỗi nhóm đều chạy `npm run build` và `npm run typecheck` trước commit. Sau sửa finding cuối, chạy lại cả hai: đạt. Build còn hai cảnh báo tracing tại landing.
- `npm run lint`: **38 lỗi / 51 cảnh báo**, thấp hơn baseline **44 / 65**; exit 1 vì lỗi baseline. Không tắt rule, không sửa `src/lib`.
- Browser Chromium: session giả trong `sessionStorage`, API mock chỉ trong browser; 1440px và 390px. Ingredients: card và preview form; catalogue: chọn đại lượng; media: card; PDF: workspace không có công thức; quiz: card, editor có câu hỏi, results có kết quả. Các màn này không tràn ngang tại hai viewport.
- Đã thực hiện `/ck:code-review` theo skill: spec compliance, review từng nhóm và adversarial review bằng reviewer độc lập. Sửa selection catalogue bị reset khi reload và khôi phục hiển thị xuống dòng trong quiz editor; reviewer xác nhận lại. PDF review không có finding mới.
- Quét `qm-` và `management-styles.css` trong `src/frontend/src`: không còn. File `.tsx` phase sửa/tạo không còn literal hex; không file mới trên 200 dòng. File cũ còn dài: catalogue 537, ingredients edit 334/new 307/list 287, media-library 211, PDF workspace 684/history 243, quiz editor 272/results 498 dòng.
- Không sửa backend, `src/frontend/src/lib`, `app/api`, `next.config.mjs`; không push; không chạy `dotnet build` theo chỉ đạo.

## Commit

- `994d1df` — ingredients
- `53f542b` — catalogue
- `2307867` — media
- `032ded0` — ẩn ID media khi thiếu tên
- `4c6f104` — PDF
- `d5a3e7f` — giữ lựa chọn catalogue
- `c1849bd` — quiz management
- `70d7613` — semantic token trạng thái tải ingredients

## Cảnh báo Content AI

Chỉ sửa giao diện, không sửa pipeline. FLUX không hỗ trợ `negative_prompt`; dùng positive framing, không dùng từ phủ định; chỉ đưa nguyên liệu thị giác, loại nguyên liệu hòa tan; quy đổi món Việt sang thuộc tính vật lý phổ quát. Chuẩn mục tiêu: `steps: 4`, prompt 300–600 ký tự, chủ thể trong 77 token đầu, Gemini `temperature: 0.2`. Tài liệu ghi runtime Gemini hiện dùng `0.7`; phase này không thay đổi.

## Giới hạn

Gateway không chạy. Chưa xác minh upload/kéo-thả thật, AI generation, preview/export PDF có Blob thực, thao tác CRUD hoặc phát hành quiz với backend; mock chỉ xác minh layout và dữ liệu trình bày. Chưa kiểm thử role Viewer/Admin bằng backend. Một số ảnh, thống kê tổng hợp, thời lượng và gợi ý trong Figma không có ở dữ liệu API hiện dùng nên không hiển thị. Contrast primary/chữ trắng là deviation đã biết trong `docs/DESIGN.md`.

**Status: DONE_WITH_CONCERNS** — File logic hiện hữu còn trên 200 dòng: `media-library.tsx` 211, `pdf-document-workspace.tsx` 684, `management-results.tsx` 498, `management-editor.tsx` 272. Gate dưới 200 dòng áp dụng cho file mới.
