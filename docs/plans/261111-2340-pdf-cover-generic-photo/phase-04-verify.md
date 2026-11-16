# Phase 4: Verify độc lập (orchestrator, không tin báo cáo thợ)

Status: pending.

## Checklist
1. `git status` + `git diff`: đúng ownership, không file thừa (không có file ảnh, không thay đổi DB). Lưu ý có thể có thay đổi không phải của đợt này do người khác sửa (ví dụ `toast.tsx`, `management-recipe-picker.tsx` đã bị sửa trước khi bắt đầu): không tính, không đụng.
2. Tự chạy `dotnet build src/backend/RecipeHub.sln` và `dotnet test` các project liên quan. Ghi exit code.
3. Xem ảnh chụp trang 1 do thợ gửi và tự render lại: nền nâu ấm có đốm sáng giống mẫu A, chữ trắng đọc rõ, không chữ/logo thừa.
4. Render PDF thật (1 món, 7 món, bản nháp + chính thức) và xem trang 1: nền mẫu A, không hộp, tiêu đề/ngày đúng, nhãn đúng; bộ nhiều món vẫn có mục lục trang 2.
5. Dò chính tả phần chữ thêm/sửa (DESIGN.md, LICENSES, comment): tiếng Việt dấu, không dash em/en, không UUID thô.
5b. Đo sức chứa trang quy trình (user hỏi "bao nhiêu bước mới tràn"): render công thức với 4, 5, 8, 9, 12 bước, mỗi cỡ chạy hai lần (bước có ảnh, bước chỉ có chữ), ghi số trang quy trình thực tế. Báo bảng kết quả cho user. Không sửa bố cục trang quy trình trong đợt này.
6. Đối chiếu từng yêu cầu trong plan.md. Diff rỗng/stub/mock = FAIL.
7. Báo user kèm bằng chứng, nói rõ phần chưa kiểm chứng.
