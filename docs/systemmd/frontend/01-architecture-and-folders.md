# Frontend 01: Kiến Trúc & Bố Cục Thư Mục

## 1. Công Nghệ Nền Tảng
- Next.js 14 (App Router, Standalone build).
- React 18, TypeScript, Tailwind CSS, Lucide React Icons.
- Không dùng Redux / MobX cồng kềnh; dùng React Context cho Auth/Session và local state theo component.

## 2. Bố Cục Thư Mục `src/frontend/`

```text
src/frontend/
├── package.json
├── next.config.mjs
├── tailwind.config.ts
├── src/
│   ├── app/                                 # App Router Next.js 14
│   │   ├── layout.tsx                       # Root layout (Google Sans font, metadata)
│   │   ├── (auth)/                          # Route group xác thực (Centered card)
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (platform)/                      # Route group không gian làm việc chính
│   │   │   ├── layout.tsx                   # Bọc WorkspaceShell toàn bộ role
│   │   │   ├── loading.tsx                  # Loading indicator chuẩn Warm Editorial
│   │   │   ├── platform/page.tsx            # Hub chọn không gian làm việc
│   │   │   ├── settings/page.tsx            # Cấu hình tài khoản cá nhân
│   │   │   ├── help/page.tsx                # Hướng dẫn thao tác SOP
│   │   │   ├── admin/                       # Phân hệ Admin
│   │   │   ├── rnd/                         # Phân hệ R&D
│   │   │   └── viewer/                      # Phân hệ Viewer / Barista
│   │   └── api/backend/[...path]/route.ts   # Next.js API proxy chuyển tiếp sang Gateway
│   ├── components/                          # UI components tái sử dụng
│   │   ├── workspace/                       # Khung làm việc dùng chung
│   │   │   ├── workspace-shell.tsx          # Shell chứa Sidebar, Topbar, User Menu
│   │   │   ├── workspace.css                # Animation & rules
│   │   │   ├── data-table.tsx               # Bảng dữ liệu chuẩn
│   │   │   ├── status-badge.tsx             # Badge trạng thái & Role badge
│   │   │   ├── dialog.tsx                   # Modal dialog chuẩn hóa
│   │   │   ├── fields.tsx                   # Input, Button, Select chuẩn Warm Editorial
│   │   │   ├── media-library.tsx            # Trình quản lý media tập trung
│   │   │   └── document-workspace.tsx       # Khung xem SOP & tài liệu
│   │   ├── quizzes/                         # Phân hệ Quiz (Viewer & Management)
│   │   └── landing/                         # Trang giới thiệu ngoài
│   ├── lib/
│   │   ├── api/                             # API clients kết nối backend
│   │   │   ├── client.ts                    # HTTP fetcher cơ sở
│   │   │   ├── backend-repository.ts        # Repositories tổng hợp
│   │   │   ├── quiz-management.ts           # Client quản lý đề quiz (Admin, R&D)
│   │   │   └── quiz-viewer.ts               # Client làm bài quiz (Viewer)
│   │   ├── demo/                            # Quản lý phiên làm việc & phân quyền
│   │   │   ├── provider.tsx                 # DemoAuthProvider
│   │   │   └── permissions.ts               # Phân quyền URL theo role
│   │   └── utils.ts                         # Tiện ích định dạng (tiền, số, ngày)
│   └── styles/
│       └── globals.css                      # Semantic tokens, Tailwind base
```

## 3. Quy Tắc Đặt Tên & Tổ Chức File
1. **Pages & Routes:**
   - Dùng kebab-case cho URL: `/rnd/recipes`, `/viewer/quizzes/history`.
   - Tham số động dùng ngoặc vuông: `[id]/page.tsx`, `[attemptId]/result/page.tsx`.
2. **Components:**
   - Đặt trong `components/<tên-module>/<tên-thành-phần>.tsx`.
   - Viết PascalCase cho tên Component export (`export function DataTable(...)`).
   - File style cục bộ đi kèm nếu cần (VD: `workspace.css`, `viewer-quiz.css`).
3. **API Repositories:**
   - Tách riêng theo nghiệp vụ trong `src/lib/api/`.
   - Không gọi `fetch()` rải rác bên trong components; bắt buộc đóng gói qua client/repository.
