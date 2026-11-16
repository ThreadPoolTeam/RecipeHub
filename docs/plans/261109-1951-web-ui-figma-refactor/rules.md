# Luật chung cho mọi phase (BẮT BUỘC)

Repo: `D:/AShiroru/LessonFPT/semester 8/project-prn-prm/RecipeHub` (làm việc trong worktree Orca được giao, cùng cấu trúc). FE: `src/frontend` (Next.js 16, Tailwind 3.4, lucide-react). Đường dẫn plan dưới đây là ở repo chính (đọc bằng đường dẫn tuyệt đối):
`D:/AShiroru/LessonFPT/semester 8/project-prn-prm/RecipeHub/docs/plans/261109-1951-web-ui-figma-refactor/`

## Đọc trước
1. `AGENTS.md` (repo root) — đọc lại khi cần. Giao tiếp tiếng Việt ngắn gọn; code/commit viết bình thường.
2. `docs/systemmd/governance.md` + `docs/systemmd/frontend/*.md`.
3. `docs/DESIGN.md` (mới, sau phase 0) — mọi quyết định UI phải đối chiếu mục/token trong đó.
4. `figma-spec.md`, `figma-screens.md` cùng thư mục plan.

## Cấm sửa
- `src/backend/**`, `src/frontend/src/lib/**`, `src/frontend/src/app/api/**`, `infra/**`.
- Logic `permissions.ts`, route/URL, role guard, state, handler, fetch, validation. Chỉ đổi JSX/markup/class/styling và tách component (giữ nguyên hành vi).
- Không thêm màn/route mới. 4 màn Figma chưa có route (so sánh phiên bản, chi tiết nguyên liệu, bản nháp ảnh AI, viewer/ingredients) bị bỏ qua.

## Chuẩn code
- File mới < 200 dòng, kebab-case, tách subcomponent (page lớn: giữ state/handler ở page hoặc custom hook, đẩy markup ra component).
- Dùng semantic token (`bg-card`, `text-foreground`, `border-border`, `text-muted-foreground`, `bg-primary`...). KHÔNG thêm hex literal / `bg-[#...]`. Không file CSS lẻ mới.
- Giữ prop API của primitive hiện có để không vỡ ~35 importer; thêm prop mới thì optional.
- Giữ `prefers-reduced-motion: reduce`.
- Không hiện UUID/hash/lease token thô; fallback "Không xác định"/"Chưa cập nhật"; mã nghiệp vụ (CF-001, QZ-001, DOC-014) được hiện.
- Lucide stroke 1.5. Copy tiếng Việt theo Figma (nếu Figma khác copy cũ).
- Giữ Tailwind `content` glob: chỉ tạo file trong `src/{app,components}`.

## Figma
fileKey `9gCw3BzwxSGGLt7S1Mcya9`. Tạo session (`create_session`) rồi dùng `get_design_context` / `get_screenshot` cho node trong brief. Load skill/guide Figma yêu cầu trước khi gọi. Nếu node trả quá lớn → drill con.

## Quy trình mỗi phase
1. `/ck:cook` với phase file (nếu lệnh không tồn tại, tự làm theo phase file thủ công).
2. Cổng kiểm: trong `src/frontend` chạy `npm run build`, `npm run lint`, `npm run typecheck` (script thêm ở phase 0) — phải xanh. Không bỏ qua lỗi.
3. Tự review: `/ck:code-review` trên thay đổi chờ; sửa mọi finding đúng; build lại.
4. Commit atomic, conventional (`refactor(web): ...`, `docs: ...`), KHÔNG tham chiếu AI, KHÔNG push, không commit .env/bí mật.
5. Ghi `reports/phase-NN-report.md` (trong thư mục plan ở repo chính): việc đã làm, file đổi, kết quả build/lint/typecheck, hex còn lại (`grep -rE "\[#[0-9A-Fa-f]{3,8}\]" src/frontend/src | wc -l`), file >200 dòng còn lại, concerns. Kết thúc bằng:
```
**Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
**Summary:** 1-2 câu
**Concerns/Blockers:** nếu có
```
6. Dừng, chờ chỉ huy (Claude) gửi phase kế. Không tự sang phase khác.

## Quyết định môi trường & chuẩn (chốt sau phase 0 bị chặn)
- Đĩa C: gần hết. `src/frontend/node_modules` và `.next` của worktree là junction sang `D:\orca-cache\recipehub-fe\`. Mọi lệnh npm/next đặt `npm_config_cache=D:/orca-cache/npm TEMP=D:/orca-cache/tmp TMP=D:/orca-cache/tmp`. Không chạy `dotnet build` (BE không đổi). Không xóa file ngoài node_modules/.next.
- Font: Outfit + Figtree không có glyph tiếng Việt → fallback ngay sau Figtree là Google Sans local (`public/fonts/google-sans-*.woff2`, unicode-range Việt). Không xóa Google Sans; không dùng Roboto làm fallback.
- Lint: baseline đã fail sẵn (44 lỗi/65 cảnh báo, trong page + `src/lib`). Gate = không vượt baseline và file mình tạo/sửa không sinh lỗi mới; không sửa `src/lib`, không tắt rule che lỗi; ghi số liệu trong report.
- Contrast: primary `#ED4061` + chữ trắng = 3.81:1 (<4.5). Theo Figma, không đổi màu; ghi "deviation đã biết" trong DESIGN.md mục Accessibility.
- Figma: omp không dùng được Figma MCP → đọc ảnh chụp `figma-shots/<node-id có dấu gạch>.png` (vd `156-271.png`) + `figma-shots/INDEX.md` trong thư mục plan ở repo chính. Không dùng Gemini CLI cho Figma. Ảnh không đủ chi tiết → ghi vào report, không bịa.

## CodeGraph
Khảo sát code dùng CodeGraph (`codegraph explore`) trước; sau khi sửa ngoài OMP chạy `codegraph sync .`. Dùng LSP xác nhận symbol/reference.
