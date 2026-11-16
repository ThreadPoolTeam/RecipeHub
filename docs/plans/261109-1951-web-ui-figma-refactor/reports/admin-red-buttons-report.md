# Admin primary buttons

- `src/frontend/src/app/globals.css`: accent admin đổi sang `--color-primary`; giữ nền, density và chiều cao control. `Button` primary/gold cùng các thành phần khác dùng `--role-accent` (gồm underline navigation) đổi theo.
- `src/frontend/src/app/(platform)/admin/page.tsx`: CTA “Quản lý tài khoản” đổi `bg-ink` sang `bg-primary`.
- `docs/DESIGN.md`, `docs/systemmd/frontend/04-design-system-and-components.md`: đồng bộ quyết định accent admin. Dùng token primary và focus ring sẵn có theo DESIGN.md mục 2, 5 và 7; không đổi bố cục.
- Giữ `bg-foreground` ở backdrop dialog/drawer và các nền tối không phải primary action; không đổi nút destructive hay badge.

## Kiểm chứng
- `npx tsc --noEmit`: thành công.
- `npx eslint "src/app/(platform)/admin/page.tsx"`: thành công, không output.
- `npm run lint`: 38 errors, 46 warnings ngoài các file landing/admin đã sửa.
- `npm run build`: `✓ Compiled successfully`, `✓ Generating static pages (31/31)`.
- Browser `/admin/users`: đăng nhập demo qua gateway local port 5000, nút “Tạo tài khoản” có computed background `rgb(237, 64, 97)`; ảnh `admin-red-after.png`.
- Chữ trắng trên primary tương phản khoảng 3.81:1, thấp hơn 4.5:1 theo DESIGN.md mục 7.

Status: DONE_WITH_CONCERNS
