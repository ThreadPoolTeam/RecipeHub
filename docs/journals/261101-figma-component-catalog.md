# Nhật ký: mở rộng Figma Mobile Component Catalog

## Khảo sát
- `src/mobile/lib/core/widgets` có `RecipeHubLogo` và `ScreenFrame`; các màn feature dựng phần lớn UI bằng Flutter Material 3 và `Container` với token `NomadKit`.
- Pattern được tìm thấy qua login, lookup/recipe detail/video, SOP, learning/progress/notifications, feedback, profile, admin training, timer, quiz, practical evaluation và system states.
- Trước thay đổi, `generateMobileComponentsPage` chỉ có primary/secondary button, một text field, một status badge và recipe-summary frame; recipe summary chưa phải `COMPONENT`.
- Figma MCP trả quota limit khi đọc metadata/search design system, sau khi get_libraries thành công. Dùng screenshot hiện có và source code; không ghi trực tiếp lên file Figma từ MCP.

## Thực hiện
- Mở rộng generator từ 4 mẫu lên 50 component masters, chia 4 nhóm: Actions & Navigation; Form & Selection; Status, Feedback & Progress; Content & Data Cards.
- Bao phủ pattern thật: Elevated/Outlined/Text buttons, loading/FAB/IconButton, shell/detail app bar, Viewer/Admin bottom nav, fields/search/dropdown, chips/size selector/checkbox/switch, badge/banner/progress, recipe/SOP/learning/feedback/account/timer/quiz/evaluation/ingredient/empty-state cards.
- Recipe card được nâng từ frame thường thành `COMPONENT`; thêm mô tả node, dùng tokens NomadKit và Material icon path map hiện có.
- Giữ mapping `primaryButton`, `secondaryButton`, `inputField` để screen renderer tiếp tục tái sử dụng; đưa số component vào UI trạng thái và README.
- Gỡ tự động xóa các page legacy không được chọn; cleanup của generator chỉ tác động page được chọn.

## Xác minh
- `node --check tools/figma-prototype-plugin/code.js`: đạt.
- Inline script `ui.html`, `manifest.json`, và 25 icon path được dùng trong catalog: hợp lệ; không thiếu icon.
- `dotnet build src/backend/RecipeHub.sln`: thành công, 0 warning / 0 error.
- `npm run build` tại `src/frontend`: thành công; Next.js hiển thị cảnh báo security advisory và 2 cảnh báo tracing filesystem ở `src/app/page.tsx`.
- Không chạy tests theo yêu cầu vận hành. Không chụp được screenshot sau generate: Figma MCP hết quota, Figma Desktop native automation session không khả dụng.
