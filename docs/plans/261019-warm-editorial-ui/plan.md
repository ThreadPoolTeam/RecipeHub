---
title: "RecipeHub Warm Editorial — toàn bộ UI, landing trước"
description: "Chuẩn hóa DESIGN.md, giữ cinematic story, đổi navbar và triển khai theme kem–cam đất cho mọi trang."
status: in-progress
priority: P2
branch: dev
tags: [frontend, refactor, docs]
blockedBy: []
blocks: []
created: 2026-10-19
---

# RecipeHub Warm Editorial

## Phạm vi và quyết định

- Người dùng chọn cách 1: giữ landing story hiện tại, navbar mới, vùng dưới sáng đồng nhất. Yêu cầu ban đầu áp dụng UI cho tất cả trang vẫn nằm trong plan.
- Lượt lập plan chỉ viết tài liệu. Chưa sửa `docs/DESIGN.md`, source, dependencies hoặc backend; thay DESIGN.md là bước đầu khi thực thi.
- Reference: [Claude design analysis](https://getdesign.md/claude/design-md), [preview](https://getdesign.md/design-md/claude/preview.html). Đây là nguồn cảm hứng độc lập, không copy branding hoặc layout chat.
- Giữ `ScrollFrameStory`, canvas, native scroll, frames, manifest, fallback/reduced-motion và ghi nguồn tư liệu Phê La. Không hứa hiệu năng 60fps khi chưa đo.
- Không dùng mockup HTML v1–v3 làm production hoặc bằng chứng đã sửa font. Lỗi chữ trong screenshot có thật, nguyên nhân Georgia/Windows chưa được xác minh.
- Không thay auth, API contract, provider dữ liệu, nghiệp vụ, PDF pipeline; không thêm tính năng được bịa trong mockup (hao hụt, tự động phát hành SOP).

## Baseline và cách thực hiện

- Frontend: `src/frontend`; layout body đang hardcode nền tối; `globals.css` có Google Sans local với subset Vietnamese. Landing hiện dùng Google Sans, không phải Georgia trong mockup.
- `landing-page.tsx` chứa navbar, 4 workspace, CTA/footer; navbar hiện đổi ở `scrollY > 40`. Giữ vùng video nhưng thay điều kiện theme theo ranh giới section.
- `docs/DESIGN.md` đang NoirLuxe; các route/components trộn token và màu hardcode. Chỉ đổi CSS root không đủ.
- Chọn planning fast: hướng đã chốt, không thêm công nghệ; phân tích source trực tiếp, không cần research hay agent viết lại cùng một plan. Không có `ck` CLI, dùng Markdown canonical.
- Không thấy `docs/development-rules.md`, codebase-summary/code-standards/design-guidelines trong danh sách docs; dùng quy tắc repo đã cung cấp.

- Cập nhật 2026-10-31: `../261031-quiz-ui/plan.md` kế thừa DESIGN.md cho Quiz production; wordmark Recipe đen/Hub caramel không dấu chấm, giữ badge. Không thay story cinematic hoặc chờ hoàn tất toàn bộ phase kiểm chứng của plan này; không hard blocker.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Design system và nền dùng chung](./phase-01-design-system.md) | Complete |
| 2 | [Landing cinematic sang editorial và navbar](./phase-02-landing-navbar.md) | Complete |
| 3 | [Toàn bộ route, smoke và nghiệm thu](./phase-03-all-pages-verification.md) | In Progress (Frontend complete; backend build blocked by running processes) |

## Cross-plan dependencies

| Plan | Quan hệ | Xử lý |
|------|---------|-------|
| 261011-recipehub-cinematic-landing | Kế thừa story, thay quy chuẩn màu navbar/vùng dưới | Ghi chú supersession ở plan cũ; không chạy lại task dựng landing cũ |
| 261014-recipehub-frontend-role-flows | Giữ flow, thay presentation | Ghi chú theme mới ở plan cũ; không khôi phục NoirLuxe |
| 261007-0357-recipehub-platform-foundation | Dùng shell hiện có | Không cần đợi toàn bộ foundation nghiệm thu |
| 261017-content-ai-media | Giữ contract ảnh; không sửa backend | Không phụ thuộc việc hoàn thành mọi phase Content để restyle |

Không tạo blocker giả từ metadata pending cũ: đầu ra UI cần dùng đã tồn tại. Đây là quan hệ kế thừa/thay thế thiết kế, không phải phụ thuộc hoàn thành cả plan. `blocks/blockedBy` rỗng; không đánh dấu plan cũ completed. PR #5 chưa được giả định đã merge: nếu branch tích hợp thay đổi, đọc lại adapter/page trước khi sửa và giữ contract hiện hành.

## Ownership và trình tự

Một integration owner sửa DESIGN.md, globals, layout, Tailwind, shared components. Thứ tự 1 → 2 → 3; không chạy các plan cũ đồng thời trên cùng file. Giữ 3 phase để tránh phân rã từng màu thành task; phase 3 có checklist theo từng route. Không đổi framework, icon library hoặc thêm animation dependency.

## Definition of done

- DESIGN.md là nguồn quy chuẩn duy nhất; mọi route trong inventory phase 3 đã được kiểm tra, không chỉ landing.
- Story không đổi; navbar đọc rõ khi cuộn tiến/ngược, reload giữa trang, nhảy anchor và mobile menu.
- Không còn thẻ dark/gold ngoài vùng cinematic được phép; ảnh/content media không bị lọc màu.
- Kiểm tra thực tế desktop/mobile, keyboard, tiếng Việt, trạng thái lỗi/rỗng/loading và các hành động hiện có; build FE + BE thành công hoặc ghi blocker chính xác, không nhận hoàn tất nếu thiếu tiêu chí.
- Không commit/push, phát sinh chi phí AI hoặc thao tác dữ liệu production nếu chưa được yêu cầu.

## Handoff

Đọc phase 1 trước; hoàn tất docs/DESIGN.md trước code. Hydrate checkbox từ 3 phase ở phiên thực thi; status implementation vẫn pending sau phiên planning.
