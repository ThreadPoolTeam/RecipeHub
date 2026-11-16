# Round 5 — Nhật ký hoạt động

- Đổi nhãn hiển thị trên nav, dashboard admin, trang nhật ký, lỗi kết nối, giám sát, bảng tài khoản, trợ giúp, hồ sơ và landing. Đồng bộ tên trong `docs/systemmd/frontend/03-roles-and-permissions.md` và `05-data-fetching-and-state.md`.
- Giữ route `/admin/logs`, API, service, symbol và thuật ngữ kỹ thuật backend. Không đổi layout, token, quyền hay schema; nhãn dễ hiểu hơn theo DESIGN.md mục 5 và 7.
- `npx tsc --noEmit`, `npm run build` và `dotnet build src/backend/RecipeHub.sln --no-restore`: đạt.
- ESLint các file sửa: 1 lỗi `react-hooks/set-state-in-effect` tại `admin/logs/page.tsx:95`, tồn tại trước thay đổi wording; không sửa ngoài phạm vi.
- Browser bản production: `/admin/logs` hiển thị heading và nav “Nhật ký hoạt động”; không thấy nhãn cũ trên trang. Ảnh: `round5-activity-log.png`. Tìm kiếm trong `src/frontend/src` và `docs/systemmd/frontend` không còn “kiểm toán”.

Status: DONE_WITH_CONCERNS
ROUND5_COMPLETE
