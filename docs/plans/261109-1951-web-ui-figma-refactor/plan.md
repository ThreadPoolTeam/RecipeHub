---
title: Web FE full UI refactor theo Figma
status: completed
created: 2026-11-09
scope: src/frontend + docs/DESIGN.md + docs/systemmd (docs)
blockedBy: []
blocks: []
supersedes: [261019-warm-editorial-ui]
---

# Web FE UI refactor — Figma `9gCw3BzwxSGGLt7S1Mcya9`

Mục tiêu: viết lại toàn bộ UI web theo Figma mới; DESIGN.md viết lại hoàn toàn (bản cũ → `docs/journals/`). Luồng, business rule, BE, `src/frontend/src/lib/**`, `app/api/**`, logic `permissions.ts` KHÔNG đổi.

Đọc trước mọi phase: [rules.md](rules.md), [figma-spec.md](figma-spec.md), [figma-screens.md](figma-screens.md).

## Quyết định đã chốt
- Shell: top-nav Figma + drawer mobile dưới `md`; bỏ sidebar; giữ guard/role nav.
- 4 màn Figma chưa có route (so sánh phiên bản, chi tiết nguyên liệu, bản nháp ảnh AI, viewer/ingredients) → backlog, KHÔNG làm.
- Landing theo Figma, giữ `ScrollFrameStory` (ngoại lệ tối).
- 1 worktree, phase tuần tự, mỗi phase `/ck:cook`.

## Phases
| # | File | Status |
|---|---|---|
| 0 | [phase-00-foundation.md](phase-00-foundation.md) | done (commits 5e992e6, 7e671c5) |
| 1 | [phase-01-primitives.md](phase-01-primitives.md) | done (ac59df3, c9c27a0, e979435) |
| 2 | [phase-02-shell-auth.md](phase-02-shell-auth.md) | done (3cd7612, 39dd568) |
| 3 | [phase-03-landing-account.md](phase-03-landing-account.md) | done (72f63d6, b90c5aa, 1f97bcc) |
| 4 | [phase-04-rnd-recipes.md](phase-04-rnd-recipes.md) | done (bff8b71..45e076f; edit page còn 644 dòng, detail 677 — page giữ logic, tách markup) |
| 5 | [phase-05-rnd-catalog-media-docs-quiz.md](phase-05-rnd-catalog-media-docs-quiz.md) | done w/ concerns (994d1df..70d7613; file logic nặng còn >200: pdf-document-workspace 684, management-results 460, catalogue page 508, media-library 211; logic đã đối chiếu khớp) |
| 6 | [phase-06-admin-viewer.md](phase-06-admin-viewer.md) | done (0c66936..111ab15; logic đối chiếu khớp) |
| 7 | [phase-07-cleanup-docs.md](phase-07-cleanup-docs.md) | done (commits cleanup + docs sync + journal; hex `[#...]` = 0, daisyui/Roboto/alias đã gỡ) |

Reports: `reports/phase-NN-report.md` (omp ghi).

## Ghi chú trước khi merge/PR
- Commit 7e671c5 thêm hack vào `src/frontend/next.config.mjs` (turbopackAdditionalRoots khi `node_modules` là junction, do ổ C đầy). Là workaround môi trường, KHÔNG đưa vào PR cuối; chỉ huy xử lý riêng trước merge (phase 7 không đụng file này).
- Lint baseline chấp nhận: 44 lỗi / 65 cảnh báo (có sẵn trước refactor).
- Deviation đã biết: primary `#ED4061` + chữ trắng 3.81:1; Outfit/Figtree không có glyph Việt (fallback Google Sans).
- `figma-shots/` (68 PNG ~15MB) chưa commit.
