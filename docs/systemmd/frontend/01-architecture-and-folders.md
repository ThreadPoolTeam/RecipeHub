# Frontend 01: Kiến Trúc & Bố Cục Thư Mục

## 1. Công Nghệ Nền Tảng
- Next.js 16 (App Router, Standalone khi `DOCKER_BUILD` bật).
- React 19, TypeScript, Tailwind CSS, Lucide React Icons.
- Không dùng Redux / MobX cồng kềnh; dùng React Context cho Auth/Session và local state theo component.

## 2. Bố Cục Thư Mục `src/frontend/`

```text
src/frontend/
├── package.json
├── next.config.mjs
├── tailwind.config.ts
├── src/
│   ├── app/                                 # App Router Next.js 16
│   │   ├── layout.tsx                       # Root layout (font và metadata)
│   │   ├── globals.css                      # Semantic tokens, Tailwind base
│   │   ├── (auth)/                          # Route group xác thực (Centered card)
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   └── forbidden/page.tsx
│   │   ├── (platform)/                      # Route group không gian làm việc chính
│   │   │   ├── layout.tsx                   # Bọc WorkspaceShell toàn bộ role
│   │   │   ├── loading.tsx                  # Loading indicator
│   │   │   ├── platform/page.tsx            # Hub chọn không gian làm việc
│   │   │   ├── settings/page.tsx            # Cấu hình tài khoản cá nhân
│   │   │   ├── help/page.tsx                # Hướng dẫn thao tác SOP
│   │   │   ├── admin/                       # Phân hệ Admin
│   │   │   ├── rnd/                         # Phân hệ R&D
│   │   │   └── viewer/                      # Phân hệ Viewer / Barista
│   │   └── api/backend/[...path]/route.ts   # Next.js API proxy chuyển tiếp sang Gateway
│   ├── components/                          # UI components tái sử dụng
│   │   ├── workspace/                       # Khung làm việc dùng chung
│   │   │   ├── workspace-shell.tsx          # Shell với top navigation và mobile drawer
│   │   │   ├── workspace.css                # Animation & rules
│   │   │   ├── data-table.tsx               # Bảng dữ liệu chuẩn
│   │   │   ├── status-badge.tsx             # Badge trạng thái & Role badge
│   │   │   ├── dialog.tsx                   # Modal dialog chuẩn hóa
│   │   │   ├── fields.tsx                   # Input, Button, Select dùng chung
│   │   │   ├── media-library.tsx            # Trình quản lý media tập trung
│   │   │   └── pdf-document-workspace.tsx   # Biên tập và xem trước tài liệu PDF
│   │   ├── quizzes/                         # Phân hệ Quiz (Viewer & Management)
│   │   └── landing/                         # Trang giới thiệu ngoài
│   └── lib/
│   │   ├── api/                             # API clients kết nối backend
│   │   │   ├── client.ts                    # HTTP fetcher cơ sở
│   │   │   ├── backend-repository.ts        # Repositories tổng hợp
│   │   │   ├── quiz-management.ts           # Client quản lý đề quiz (Admin, R&D)
│   │   │   └── quiz-viewer.ts               # Client làm bài quiz (Viewer)
│   │   ├── demo/                            # Quản lý phiên làm việc & phân quyền
│   │   │   ├── provider.tsx                 # DemoProvider, hook useDemo
│   │   │   └── permissions.ts               # Phân quyền URL theo role
│   │   └── ai-draft-storage.ts              # Metadata bản nháp ảnh phía client
```

## 3. Quy Tắc Đặt Tên & Tổ Chức File
1. **Pages & Routes:**
   - Dùng kebab-case cho URL: `/rnd/recipes`, `/viewer/quizzes/history`.
   - Tham số động dùng ngoặc vuông: `[id]/page.tsx`, `[attemptId]/result/page.tsx`.
2. **Components:**
   - Đặt trong `components/<tên-module>/<tên-thành-phần>.tsx`.
   - Viết PascalCase cho tên Component export (`export function DataTable(...)`).
   - Tái sử dụng style hiện có (`workspace.css`, `viewer-quiz.css`); không thêm CSS biệt lập làm phân mảnh semantic tokens.
3. **API Repositories:**
   - Tách riêng theo nghiệp vụ trong `src/lib/api/`.
   - Không gọi `fetch()` rải rác bên trong components; bắt buộc đóng gói qua client/repository.
