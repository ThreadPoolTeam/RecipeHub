# Report: chuyển thông báo kết quả thao tác sang Toast (DeepSeek)

Phạm vi sau điều chỉnh: các file toast của DEEPSEEK, đã loại toàn bộ `src/frontend/src/app/(platform)/rnd/ingredients/**` (omp phụ trách cả ảnh nguyên liệu và toast ở đó). Không sửa `src/lib/ai-draft-storage.ts`, không sửa logic cache ảnh nháp, không commit.

Lưu ý bàn giao: trước khi có điều chỉnh phạm vi, ba file trong `rnd/ingredients/**` đã được sửa và thay đổi vẫn đang nằm trong working tree. Tôi đã dừng, không sửa thêm và không tự hoàn nguyên; mục "Bàn giao rnd/ingredients/**" liệt kê chính xác nội dung đang có để reviewer/omp quyết định giữ hoặc hoàn nguyên.

## Bảng file

| File | Alert cũ | Xử lý |
|---|---|---|
| `src/app/(platform)/rnd/catalogue/page.tsx` | `alertNotice` dùng chung cho lỗi tải và kết quả lưu/đổi trạng thái | Tách `loadError` giữ Alert; lưu đại lượng/đơn vị và đổi trạng thái chuyển toast |
| `src/app/(platform)/rnd/recipes/new/page.tsx` | `errorMsg` | Giữ Alert cho lỗi tải danh mục và validation; lỗi API khi tạo chuyển toast; thêm toast thành công |
| `src/app/(platform)/rnd/recipes/[id]/page.tsx` | `errorMsg`, `actionSuccess`, `copyError` | Giữ Alert cho lỗi tải trang; phát hành/lưu trữ/khôi phục và sao chép chuyển toast; `copyError` chỉ còn validation; giữ Alert cảnh báo media |
| `src/app/(platform)/rnd/recipes/[id]/edit/page.tsx` | `forkNotice`, `successMsg`, `errorMsg`, `aiImageError` | Bỏ `forkNotice`/`successMsg`/`aiImageError`, chuyển toast; `errorMsg` giữ cho lỗi tải và validation |
| `src/components/workspace/media-library.tsx` | `errorMsg`, `successMsg` | `loadError` giữ Alert cho lỗi tải danh mục và lỗi tải liên kết media; tải lên/xóa/thử lại xóa chuyển toast |
| `src/components/workspace/pdf-document-history.tsx` | `errorMsg`, `alert()` của trình duyệt khi tải tệp | Giữ Alert cho lỗi tải danh sách; tải tệp thành công/thất bại chuyển toast |
| `src/components/workspace/pdf-document-preview.tsx` | Không có Alert | Không đổi |
| `src/components/workspace/pdf-document-workspace.tsx` | `generalError`, `generalSuccess`, `alert()` khi vượt giới hạn | Bỏ `generalSuccess`; xuất tài liệu thành công/thất bại chuyển toast; giữ Alert cho validation và lỗi tải danh mục; vượt giới hạn chuyển toast info; giữ cảnh báo công thức chưa phát hành |
| `src/components/recipes/edit-recipe-ai-dialog.tsx` | `aiImageError` | Bỏ prop và Alert; lỗi sinh/chấp nhận ảnh AI do handler ở `edit/page.tsx` chuyển toast |

## Chi tiết theo file

### catalogue/page.tsx

- `loadReferenceData` lỗi vẫn hiển thị Alert vì là lỗi tải dữ liệu của trang (không có retry nhưng là trạng thái khối, không phải kết quả một hành động).
- Lưu đại lượng/đơn vị: `toast({ type: 'success', title: 'Đã lưu đại lượng đo' | 'Đã lưu đơn vị đo', description: tên })`; lỗi API: `toast({ type: 'error', title: 'Không thể lưu thay đổi', description })`.
- Đổi trạng thái: tiêu đề `Đã tạm khóa` / `Đã kích hoạt`, mô tả gồm loại và tên; lỗi API chuyển toast.
- `formError` trong dialog giữ nguyên vì là validation gắn với ô nhập.

### Bàn giao rnd/ingredients/** cho omp

Ba file dưới đây đã bị sửa trước khi điều chỉnh phạm vi và **không được sửa thêm**:

- `src/app/(platform)/rnd/ingredients/page.tsx`: đổi `alertNotice` thành `loadError`, Alert chỉ còn lỗi tải nguyên liệu/loại nguyên liệu; đổi trạng thái dùng toast; `onNotice` của `IngredientCategoryPanel` bọc thành toast; import `useToast`.
- `src/app/(platform)/rnd/ingredients/[id]/edit/page.tsx`: import `useToast`; lỗi API khi cập nhật chuyển toast, thêm toast thành công trước `router.push('/rnd/ingredients')`; Alert vẫn giữ cho lỗi tải và validation.
- `src/app/(platform)/rnd/ingredients/new/page.tsx`: import `useToast`; lỗi API khi tạo chuyển toast, thêm toast thành công trước khi chuyển trang; Alert vẫn giữ cho lỗi tải và validation.

Reviewer/omp cần chọn một trong hai: giữ các thay đổi này khi làm toast cho `rnd/ingredients/**`, hoặc hoàn nguyên ba file rồi tự triển khai lại. Không có file nào khác trong `rnd/ingredients/**` bị đụng.

### recipes/new/page.tsx

- Alert giữ cho lỗi tải danh mục Recipe Service và các validation (mã, tên, đơn vị, định lượng, nội dung bước).
- Lỗi API khi tạo công thức chuyển toast `Không thể tạo công thức`.
- Thêm toast `Đã tạo công thức` kèm mã và tên trước khi điều hướng.

### recipes/[id]/page.tsx

- Alert giữ cho lỗi tải chi tiết công thức (màn hình không tìm thấy) và `mediaWarning` (cảnh báo thuộc nội dung: chưa tải được media).
- Bỏ `actionSuccess`; phát hành, lưu trữ, khôi phục và tạo bản sao đều dùng toast thành công/thất bại. Tiêu đề ngắn, mô tả là mã và phiên bản.
- Dialog sao chép: `copyError` chỉ còn validation mã/tên; lỗi API hiển thị toast, nhờ `z-[10000]` toast nổi trên dialog.

### recipes/[id]/edit/page.tsx

- Bỏ state `forkNotice`; thông báo tạo bản nháp mới từ bản phát hành chuyển `toast({ type: 'info' })`, chặn lặp bằng ref `forkNoticeShown` (StrictMode/effect chạy lại không toast 2 lần). Thêm `toast` vào dependency của effect, không phát sinh cảnh báo mới.
- Bỏ `successMsg`; lưu bản nháp và chấp nhận ảnh AI dùng toast thành công (ảnh bìa hoặc gắn vào bước kèm tên bước).
- Bỏ `aiImageError`; lỗi sinh ảnh và lỗi chấp nhận ảnh chuyển `toast({ type: 'error', title: 'Không thể tạo ảnh AI' | 'Không thể chấp nhận ảnh AI', description })`, không in stack.
- Giữ Alert cho: lỗi không tìm thấy công thức khi mở trình biên tập, validation trước khi lưu, và thông báo bước chưa lưu khi bấm tạo ảnh AI (validation gắn với thao tác chọn bước).

### media-library.tsx

- `loadError` + Alert cho lỗi tải danh mục media và lỗi tải thông tin liên kết khi xem chi tiết.
- Toast cho: tệp vượt 5 MB, tải ảnh lên thành công/thất bại, xóa ảnh thành công/thất bại, thử lại xóa thành công/thất bại.

### pdf-document-history.tsx

- Alert giữ cho lỗi tải danh sách tài liệu.
- Thay `alert(msg)` của trình duyệt bằng toast lỗi khi tải tệp; thêm toast thành công kèm tên tệp.
- Lỗi kết xuất xem trước vẫn nằm trong `PdfDocumentPreview` (có nút Thử lại), không đổi.

### pdf-document-workspace.tsx

- Bỏ `generalSuccess`; xuất bản nháp/chính thức thành công dùng toast `Đã xuất bản nháp` / `Đã xuất bản chính thức` kèm tiêu đề tài liệu.
- Lỗi API khi xuất chuyển toast; không còn Alert "Thành công".
- Giữ Alert cho validation trước khi xuất (chưa chọn công thức, chưa nhập tiêu đề, có công thức chưa phát hành) và lỗi tải danh mục công thức.
- Thay `alert()` khi vượt giới hạn công thức bằng toast info; giữ khối cảnh báo công thức chưa phát hành vì là cảnh báo nội dung.
- `previewError` vẫn hiển thị trong khung xem trước kèm nút Thử lại.

### pdf-document-preview.tsx

Không có Alert và không có hành động người dùng cần toast; khối lỗi xem trước có nút "Thử lại xem trước" nên giữ nguyên.

### edit-recipe-ai-dialog.tsx

Xóa `aiImageError` khỏi `Props`, destructure, dòng `Alert`, và import `Alert`. `AlertCircle` vẫn giữ cho trạng thái ảnh nháp không tải được. Không đổi `src/lib/ai-draft-storage.ts` hay logic cache ảnh nháp.

## Validation

- `npx tsc --noEmit`: pass.
- `npx eslint` trên 9 file toast còn trong phạm vi: không thêm lỗi mới. Ba file `rnd/ingredients/**` cũng đã được kiểm trước khi bàn giao và chỉ có lỗi có sẵn. Lỗi/cảnh báo có sẵn ngoài phạm vi: `react-hooks/set-state-in-effect`, `react-hooks/purity` (`Date.now` trong `recipes/new`), `exhaustive-deps` (`mediaMap`, `previewUrls`, `initialSelectedItems`, `loadReferenceData`), `no-unused-vars` (`router` ở `[id]/edit`, `setUploadTags`, `setState` trong pdf-document-history), `no-img-element`. Cảnh báo thiếu dependency `toast` phát sinh trong lúc sửa đã được xử lý bằng cách thêm `toast` vào dependency.
- `npm run build`: pass. Không chạy `next dev`; kiểm thử bằng `next start` cổng 3100 và đã tắt server sau khi chụp.
- Ảnh: `toast-deepseek.png` chụp toast thành công `Đã lưu bản nháp` (REC-001 · v2.0) sau khi bấm Lưu Bản Nháp ở `/rnd/recipes/[id]/edit` với tài khoản `rd@recipehub.demo`. Đây là file thuộc phạm vi toast hiện tại; thao tác chỉ lưu lại nguyên dữ liệu đang hiển thị, không tạo phiên bản mới vì công thức đang là bản nháp.

## Residual

- Chưa có file helper `src/lib/error-message.ts` (chỉ owner omp được tạo), nên các file dùng inline `err instanceof Error ? err.message : '...'`.
- `codeError` khi tạo mã công thức vẫn hiển thị inline trong `NewRecipeBasicInfo` (component thuộc `src/components/recipes/**`, ngoài phạm vi được sửa), nên chưa chuyển toast. Trường hợp tương tự ở trang nguyên liệu do omp phụ trách.
- Toast thành công của lưu bản nháp công thức hiển thị ngay trên trang biên tập; toast của các thao tác có điều hướng (tạo công thức) vẫn còn sau khi chuyển trang nhờ provider ở layout nền tảng, cần reviewer xác nhận là hành vi mong muốn.
- Thông báo `forkNotice` phụ thuộc ref để tránh lặp; nếu sau này effect tải lại công thức theo `dataVersion` thì cần reset ref nếu muốn thông báo lại.

## Câu hỏi mở

1. Có cần toast cho trường hợp tạo mã thất bại (hiện inline trong `CodeInput`/`NewRecipeBasicInfo`) không, hay giữ cạnh ô nhập?
2. Toast lỗi tải danh mục công thức trong `pdf-document-workspace` có nên gộp vào Alert như hiện tại hay chuyển hẳn thành toast kèm nút thử lại?
3. Có muốn toast info thay cho khối cảnh báo "Chỉ công thức đã phát hành mới được phép xuất tài liệu PDF" ở cột tóm tắt không, hay giữ vì là cảnh báo thường trực của nội dung?

TOAST_DS_COMPLETE
