# Round 4 — badge vai trò

- Admin giữ `ink`/`ink-foreground`; Viewer khôi phục `info-soft`/`info`. R&D dùng token nền `success-medium` #CFEFD0 với chữ `success` #2F6633: đậm hơn `success-soft` nhưng không solid. Badge trạng thái không đổi.
- Theo DESIGN.md mục 2, 5, 7: token ngữ nghĩa, nhãn và chấm giữ nguyên, tương phản R&D 5.51:1 và Viewer 5.72:1 đạt AA. Token và quy tắc badge được đồng bộ trong `globals.css`, `tailwind.config.ts`, `docs/DESIGN.md`, `docs/systemmd/frontend/04-design-system-and-components.md`.
- Kiểm tra: `npx tsc --noEmit`, `npx eslint src/components/workspace/status-badge.tsx tailwind.config.ts`, `npm run build`, `dotnet build src/backend/RecipeHub.sln --no-restore` đều đạt.
- Browser `/admin/users` trên bản production local xác nhận màu ba role và trạng thái không đổi; ảnh `admin-feedback-users.png`.
- Không chạy lint toàn frontend, ngoài phạm vi brief. Không đổi schema, route hoặc quyền; không commit.

Status: DONE
ROUND4_COMPLETE
