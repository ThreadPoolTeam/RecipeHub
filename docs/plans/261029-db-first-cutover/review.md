# Review và kiểm chứng kế hoạch — 2026-10-29

## Phạm vi kiểm chứng

Đây là review tài liệu, không phải xác nhận DB First đã triển khai hoặc database không mất dữ liệu. Hai scout khảo sát backend/plan; hai reviewer độc lập kiểm tra dữ liệu/rollback và scaffold/security; một human-speak reviewer kiểm tra cách giải thích và mức chắc chắn. Các agent không sửa source và không chạy test/build.

## Red-team và plain-language findings

| # | Finding | Severity | Disposition | Đã áp dụng / lý do |
|---|---|---|---|---|
| 1 | Backup DB/files chưa đủ, message đã publish nhưng chưa nằm PEL có thể mất khi Redis trống | High | Accept | Phase 1 bước 3–4, phase 3 rollback: checkpoint và restore Redis stream payload + group/cursor/PEL đồng bộ DB/files |
| 2 | Consumer restart có thể không reclaim pending của consumer cũ, job bị treo dù Redis còn | High | Accept | Đóng enqueue, drain outbox/job/PEL rồi dừng writers; không drain được thì block cutover. Phase 3 diễn tập pending gate, không tự thêm retry engine |
| 3 | Thiếu giải thích cách Code First hoạt động; thuật ngữ DB First chưa dễ hiểu | Medium | Accept | Thêm mục giải thích trong plan.md, phân biệt tạo migration/chạy migration và giải nghĩa parity/cutover/receipt |
| 4 | Trình tự xóa đường EF mutation ở phase 2/3 có thể tạo điều kiện vòng | Medium | Accept | Phase 3 bước 10: gỡ trên nhánh sau parity sơ bộ, smoke nhánh đó trên clone, rồi mới rollout thật; không chờ rollout xong mới bỏ startup DDL |
| 5 | Quy định đọc schema cho mọi sửa service có thể rộng hơn chỉ DB First | Medium | Reject thay đổi phạm vi | Đây là quy định Database Schema First đã có trong AGENTS gốc, không do plan mới thêm. Giữ đối chiếu nhẹ và ghi không ảnh hưởng DB; không yêu cầu dump/backup cho thay đổi không đụng dữ liệu/schema |

Reviewer scaffold/security không có finding critical/high/medium đủ bằng chứng; đây không là bằng chứng implementation đúng hoặc runtime đã được thử. Không tạo finding giả để đủ số lượng.

## Validation log

- User đã nêu rõ toàn backend DB First, ghi AGENTS và giải thích cách hoạt động; dữ liệu phải giữ theo trao đổi trước. Không hỏi lại các ý này như chưa có yêu cầu.
- Lựa chọn thiết kế bảo thủ: SQL versioned, reference DB/clone, generated chỉ Infrastructure, Domain giữ nguyên, không giả lịch sử EF, không reset DB. Đây là đề xuất kỹ thuật của kế hoạch, không là kết quả chạy thật.
- Chưa thực hiện interview triển khai hoặc xác nhận cửa sổ dừng ghi. Trước rollout, người vận hành phải xác định instance, quyền truy cập, backup target và lịch bảo trì trong phase 1. Nếu không đáp ứng được dừng ghi/drain, deployment bị chặn, không tự giảm scope.
- Không có blocker plan khác, Content phần persistence/schema bị chặn hai chiều đến khi cutover được nghiệm thu. Ba phase triển khai vẫn pending.

## Kiểm tra đã chạy trong lượt lập kế hoạch

- `dotnet build src/backend/RecipeHub.sln`: thành công, 0 warnings, 0 errors. Đây là build source hiện có, không phải build implementation DB First.
- `npm --prefix src/frontend run build`: compile/TypeScript/static generation chạy xong, nhưng lệnh kết thúc **exit 1** với `SecurityFatalError`: Next.js 16.4.0 bị security check chặn và đề nghị nâng cấp. Không báo frontend build pass, không chạy lại để vượt cảnh báo, không tự nâng dependency ngoài scope.
- Kiểm tra tài liệu bằng script throwaway: local links, các phase pending, quan hệ Content hai chiều không vòng. Không tạo test source-text cố định.
- Không chạy API/worker, EF update/scaffold, SQL repair, backup/restore hoặc thay quyền database. Chưa có smoke runtime DB First; những việc này thuộc phase triển khai, không thuộc chỉnh tài liệu.
- Active-plan helper đã chạy nhưng `CK_SESSION_ID` không có nên chỉ in đường dẫn, không lưu session active state. Đường dẫn plan trong handoff là nguồn bền vững.

## Rủi ro chưa được nghiệm thu

Schema/database thực tế, restore thành công, data/sequence preservation, mapping behavior và external AI integration vẫn chưa kiểm chứng. Không dùng build hoặc policy mới làm bằng chứng các mục này đã hoàn thành. Frontend security build blocker cần task nâng Next.js có phạm vi riêng, không gộp vào DB First để che lỗi.
