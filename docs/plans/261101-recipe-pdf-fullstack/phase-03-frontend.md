# Phase 3 — Frontend xuất PDF và lịch sử

## Context / trạng thái
Priority P1; Status: Code Complete (Runtime Blocked). Frontend code fully implemented and compiled cleanly (`npx tsc --noEmit` and `npm run build` with 34/34 pages static/SSR compiled, 0 errors). Obsolete demo PDF artifacts cleaned up. Live end-to-end browser runtime testing blocked pending backend/database rollout.

## Ownership / related files

ROOT=`D:/AShiroru/LessonFPT/semester 8/project-prn-prm/RecipeHub/.worktrees/recipe-pdf`.

Modify:
- `${ROOT}/src/frontend/src/components/workspace/document-workspace.tsx`: thay orchestration IndexedDB bằng PDF API/preview state rõ, tái sử dụng editor ở entry đơn/bộ.
- `${ROOT}/src/frontend/src/app/(platform)/rnd/recipes/[id]/document/page.tsx`: load real source, error/notfound/retry, không luôn chờ draft local.
- `${ROOT}/src/frontend/src/app/(platform)/rnd/recipes/page.tsx`: checkbox/page selection+export action, giữ filter/pagination đang có.
- `${ROOT}/src/frontend/src/app/(platform)/rnd/recipes/[id]/page.tsx`: nút Xuất PDF dẫn version đúng; không gọi tên SOP như một scope khác.
- `${ROOT}/src/frontend/src/app/(platform)/viewer/recipes/[id]/page.tsx`: thay getPublishedDocument/pdfBlob local bằng published-single lookup theo version và authenticated file download; giữ nút tải official, không thêm management.
- `${ROOT}/src/frontend/src/lib/api/backend-repository.ts`: gỡ document hydration giả/empty documents khi caller đã cutover, không override mới để giữ shim API demo cũ.
- `${ROOT}/src/frontend/src/lib/demo/repository.ts`, `types.ts`, `database.ts`, `seed.ts`: bỏ document APIs/types/stores/seed sau migrate references, không xóa demo identity/audit/catalog ngoài scope.

Create:
- `${ROOT}/src/frontend/src/lib/api/pdf-documents.ts`: typed API, ProblemDetails mapping, binary requests qua shared client helper do phase4 owner cung cấp.
- `${ROOT}/src/frontend/src/lib/api/pdf-document-types.ts`: request/response/capabilities DTO không storage secrets/pdfBlob persistent; nếu repo convention gộp types thì giữ một module, không barrel reexport compatibility.
- `${ROOT}/src/frontend/src/components/workspace/pdf-document-workspace.tsx`: shared 2 tabs Xuất PDF/Lịch sử, composer selection/order/filter.
- `${ROOT}/src/frontend/src/components/workspace/pdf-document-history.tsx`: paged history/detail/download.
- `${ROOT}/src/frontend/src/components/workspace/pdf-document-preview.tsx`: authenticated Blob native viewer lifecycle, stale handling, error states.
- `${ROOT}/src/frontend/src/app/(platform)/rnd/documents/page.tsx`, `${ROOT}/src/frontend/src/app/(platform)/admin/documents/page.tsx`: role route wrappers, không nhân đôi logic.

Delete sau ref check:
- `${ROOT}/src/frontend/src/lib/demo/pdf-export.ts`: renderer obsolete sau server cutover; bỏ dependency pdf-lib/fontkit khỏi package nếu không còn consumer, phase4 owns package files.
- `${ROOT}/src/frontend/src/app/api/preview-pdf/route.ts`: hardcoded PDF demo evidence route. Không giữ public static preview shim.

Reserved lead (không tự sửa): workspace-shell.tsx, lib/demo/permissions.ts, app/api/backend/[...path]/route.ts, package.json/package-lock.json, shared DataTable/Fields/Dialog. Binary helper client.ts do phase1 cung cấp sẵn trước phase3; FE dùng contract đã có, không chờ phase4 hay tạo duplicate fetch.

## Implementation steps

1. Dùng LSP references trước thay exported document symbols; nếu LSP chưa có, tool check rồi fallback references grep có kiểm chứng. Inventory cả Admin dashboard/repository consumers và Viewer, không chỉ composer.
2. Add real typed module theo DTO đã khóa, dùng binary helper phase1 trả headers/Blob hoặc Response và structured errors/AbortSignal. Chưa có backend thì viết production call đúng hợp đồng, không placeholder import, mock success hay fake PDF.
3. Build two role route wrappers and shared tabs; Admin chọn công thức từ composer, không dựng Admin Recipe CRUD. List source endpoint hiện có hỗ trợ admin/rnd read; không dựa vào local recipes seed.
4. Implement ordered selection across pagination theo UI doc: header current page only, visible selected count/list, no duplicates, version fixed, remove/up/down accessible, max from capabilities.
5. Route `[id]` giữ recipe UUID. Selection lưu `{recipeId, recipeVersionId}`; map `.recipeId`/`.versionId` từ API, tuyệt đối không `.id` làm version. Chọn version cụ thể thì GET `/recipes/{recipeId}/versions/{recipeVersionId}`, không gọi helper cũ getRecipeVersion vốn lấy latest `/recipes/{id}`. Query versionId hoặc state selection phải giữ đúng version khi mở editor.
6. Fields title/subtitle/template fixed landscape/full, selected image and caption overrides. Không dựng size matrix hay quantity editor ngoài schema. Explicit no-image selection thay fallback ảnh lỗi.
7. Preview request debounce chỉ nếu cần, mặc định button chủ động; AbortController+request sequence chống response cũ overwrite. Lưu snapshot hash cùng fingerprint request input; mọi input change invalidates preview. Request hash được server tính lại, không client crypto tự quyết.
8. Native viewer Blob + accessible Open in new tab/download preview, local zoom/page native controls. Revoke URL sau close/replacement/unmount/logout; không revoke trước viewer dùng xong. PDF preview optional iframe fallback visible link cho browser không hỗ trợ.
9. Export Draft/Published buttons enforce UI policy, backend authority. During submit disable duplicate clicks only, preserve input; 409 mark stale/refresh preview, 401 auth flow existing, 403 permission, 503 service unavailable không wipe session. No automatic POST retry.
10. Successful export response chuyển History focus đúng ID; failed request refresh history trước suggest xuất lại vì response có thể mất sau ready commit. Không hiển thị success khi chỉ nhận preview/download local.
11. History uses server page/filters; detail nguồn snapshot, timestamp timezone convention, actor real ID fallback, ready file only. History inline/download gọi `/file`, không render lại recipe source.
12. Cutover local document consumers; remove mock route and obsolete renderer. IndexedDB version migration chỉ drop obsolete document stores sau không còn references; không reset toàn database hoặc xóa audit/library local ngoài scope. Persisted old PDF demo không nhập thành official backend artifacts.
13. Không thêm persistent editor config UI. Nếu bỏ save button cũ, explain input session-only và navigation leave warning; snapshot presentation được lưu trong artifact khi xuất.

## Todo / success criteria

- [x] Typed client API module (`pdf-documents.ts`, `pdf-document-types.ts`) với binary response parsing và error handling.
- [x] Shared PDF workspace (`pdf-document-workspace.tsx`) gồm 2 tabs: "Xuất PDF" (composer) và "Lịch sử" (history).
- [x] Role route wrappers cho `/rnd/documents` và `/admin/documents`.
- [x] Multi-recipe selection across pagination với order management và duplicate prevention tại `/rnd/recipes`.
- [x] Single-recipe export integration tại `/rnd/recipes/[id]` và `/rnd/recipes/[id]/document`.
- [x] Native Blob viewer preview (`pdf-document-preview.tsx`) với auto-cleanup `URL.revokeObjectURL` và stale hash detection.
- [x] History browser (`pdf-document-history.tsx`) hiển thị snapshot metadata, paged list, download stream trực tiếp từ backend.
- [x] Viewer route (`/viewer/recipes/[id]`) cutover sang published-single lookup, giữ official download button, loại bỏ management/composer.
- [x] Dọn dẹp obsolete demo files (`pdf-export.ts`, `/api/preview-pdf/route.ts`) và IndexedDB document stores, giữ nguyên audit/catalog demo stores.
- [ ] [BLOCKED] Live browser E2E smoke tests qua Gateway với live PostgreSQL & Cloudinary: Blocked — chờ Phase 4 integration runtime deployment.
```
## Risks / checks

Khóa rộng scope: không thêm thao tác tạo lại từ bộ cũ, delete/history ownership editor hoặc lựa chọn dọc. Một template ngang thật thay ba template giả; FR-DOC-07 Should còn chưa đạt và được ghi rõ, không gọi full SRS compliance. Browser smoke trên app thật qua Gateway sau phase4, không dùng Playwright page.route trả PDF mock để nghiệm thu.
