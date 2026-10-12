# RecipeHub Cinematic Landing — Implementation Plan

> **For agentic workers:** Thực thi từng task theo executing-plans; không triển khai backend nghiệp vụ. Checklist là công việc tương lai, không phải kết quả đã chạy.

**Goal:** Dựng landing RecipeHub từ header đến footer, kể hành trình làm đồ uống bằng chuỗi frame trích từ TVC và điều khiển theo cuộn; giới thiệu phần mềm trong cùng trang.

**Architecture:** Trang `/` render nội dung semantic trên server; một client component quản lý scroll progress, tải frame có giới hạn và vẽ canvas. Giữ native scroll và CSS sticky, không scroll hijacking. Preview công thức là minh họa trong landing, không điều hướng dashboard.

**Tech Stack:** Next.js 14.2.15, React 18, TypeScript, Tailwind 3.4 đang có; Canvas 2D, requestAnimationFrame, IntersectionObserver, ResizeObserver, matchMedia; FFmpeg cho pipeline tài sản. Không thêm thư viện animation cho nhu cầu đã chốt.

**Status:** Planned — chưa triển khai.
**Created:** 2026-10-11.
**Dependencies:** Frontend foundation hiện có. Plan nền tảng `../261007-0357-recipehub-platform-foundation/plan.md` còn ghi pending; không suy ra toàn bộ nền tảng đã được nghiệm thu. Landing không cần backend chạy.

---

## 1. Quyết định đã được người dùng xác nhận

- Cinematic storytelling về làm đồ uống kết hợp giới thiệu phần mềm quản lý công thức.
- Trích frame từ `docs/videos/tvc-phe-la.mp4`; không video autoplay, không dùng video.currentTime để tua theo cuộn.
- Cuộn tiến thì frame tiến; cuộn ngược thì frame lùi. Các dòng chữ mở qua mask và dịch vào vị trí theo tiến độ cuộn.
- Desktop giữ tạm cảnh bằng sticky, hết storytelling trả về luồng trang bình thường.
- Google Sans, không thay bằng Google Sans Text/Product Sans hoặc font gần giống mà không thông báo.
- NoirLuxe: near-black #0C0C0E, warm-white #F2F0EB, gold #C9A84C; vàng tiết chế. Không Dancing Script trên landing.
- RecipeHub là chủ thể trang. Tư liệu Phê La là minh họa, không tuyên bố tài trợ/đối tác/khách hàng.
- Không tự đổi URL, không tự mở dashboard, không giả CRUD, auth hoặc nghiệp vụ đã hoàn thành.

## 2. Khảo sát repo và ảnh hưởng

### Thực tế đã đọc

- Frontend ở **`src/frontend/`**, không phải `src/frontend/recipehub-web/` như README và Compose còn ghi.
- `src/frontend/package.json`: Next 14.2.15, React 18, TypeScript; chưa có animation/test library.
- `src/frontend/src/app/page.tsx`: home foundation, gọi gateway health, liên kết `/admin`, `/rnd`, `/viewer`.
- `src/frontend/src/app/layout.tsx`: header/footer dùng chung, main max-width có padding; lang=en. Wrapper này không phù hợp landing full-bleed.
- `globals.css`: Arial và nền sáng, chưa có NoirLuxe.
- `src/frontend/Dockerfile`: build standalone, copy public; chưa có thư mục public trong danh sách frontend đã đọc.
- `infra/compose.yaml`: build context frontend vẫn là đường dẫn recipehub-web không tồn tại trong khảo sát; đây là prerequisite cho kiểm chứng container, không phải lý do chuyển frontend sang đường dẫn đó.
- TVC: 15s, 1920×1080, 50fps, không audio. Đã xem preview và frame mẫu theo giây; chưa xác định frame-accurate cut boundaries.
- Frame cuối có logo và slogan Phê La; không dùng đoạn kết thương hiệu này làm hero RecipeHub.
- Logo PNG đã xem ở `docs/materials/logo-phe-la/logo-phe-la-2.png`; SVG/PDF giữ làm nguồn, không tự đổi thành logo sản phẩm.
- Font trong repo chỉ thấy Geist; Google Sans cần lấy từ nguồn chính thức và ghi license.

### Giữ nguyên nền tảng

Không xóa gateway status hay role pages. Chuyển home foundation sang `/platform`; chuyển wrapper shell sang route group `(platform)`. `/admin`, `/rnd`, `/viewer` vẫn giữ URL. `/api/health` không đổi. Landing `/` không fetch gateway để render.

Đây là cutover home presentation, không thay thế chức năng backend hoặc mở rộng nghiệp vụ.

## 3. Layout và nội dung cuối cùng

| Vùng | Nội dung / đích liên kết | Chuyển động |
|---|---|---|
| Header | Wordmark RecipeHub; Câu chuyện `#story`; Không gian công thức `#workspace`; CTA `#workspace`; mobile nav có label rõ | Nền trong ở đầu, nền tối khi cuộn; focus-visible; không che heading |
| Hero | “Một hương vị bắt đầu từ đâu?”; mô tả RecipeHub là không gian quản lý công thức và hành trình phát triển đồ uống; cue cuộn | Frame đầu làm nền, đứng yên nếu người dùng không cuộn; heading mở từng dòng |
| Chương I | “Bắt đầu từ nguyên liệu.” / “Mỗi thành phần mở đầu một câu chuyện.” | Frame nguyên liệu; chữ reveal theo scroll |
| Chương II | “Hương vị qua từng thao tác.” / “Có những bước cần được ghi lại.” | Frame thao tác và chế biến; chuyển qua shot theo thứ tự nguồn |
| Chương III | “Một ly ngon. Cả một quá trình phía sau.” / “Giữ lại hương vị — và cả cách tạo nên nó.” | Frame thành phẩm; nhịp chữ chậm lại |
| Workspace | “Câu chuyện ấy có một nơi để lưu giữ.”; preview danh sách/chi tiết/nguyên liệu/các bước/phiên bản/ghi chú | Canvas nhường chỗ cho section mới; preview xuất hiện nhẹ rồi đứng yên |
| CTA cuối | “Giữ lại công thức. Tiếp tục sáng tạo.”; “Khám phá giao diện” về `#workspace`; liên kết phụ “Xem nền tảng kỹ thuật” tới `/platform` | Luồng cuộn bình thường, không auto-route |
| Footer | RecipeHub, anchor nội trang, nguồn tư liệu Phê La và ghi chú không hàm ý hợp tác | Tĩnh |

Preview được dựng bằng HTML/CSS có nhãn “Minh họa giao diện đề xuất”, không phải screenshot một sản phẩm đã tồn tại. Dữ liệu minh họa không gán là công thức Phê La, không bịa định lượng thương hiệu. Không button giả, không số liệu/testimonial/pricing.

## 4. File ownership và trách nhiệm

### Thay đổi file có sẵn

- `src/frontend/src/app/layout.tsx`: root chỉ giữ html/body, metadata chung, lang=vi; wrapper shell chuyển vào group, không nhân đôi header/footer.
- `src/frontend/src/app/page.tsx`: thay bằng composition landing server-side.
- `src/frontend/src/app/globals.css`: giữ Tailwind directives; bỏ font Arial áp toàn cục; khai báo typography. Theme landing scope bằng class để không đổi màu shell.
- Di chuyển `src/frontend/src/app/{admin,rnd,viewer}/page.tsx` sang `src/frontend/src/app/(platform)/{admin,rnd,viewer}/page.tsx`; giữ nguyên nội dung và URL.
- `infra/compose.yaml`: sửa riêng build context frontend thành `../src/frontend` phục vụ build đúng repo.
- `README.md`, `src/frontend/README.md`: đường dẫn chạy đúng, `/` và `/platform`, hướng dẫn generate frame/verify.
- `docs/DESIGN.md`: ghi override Google Sans cho landing, kích thước responsive và quy tắc motion; không tự đổi theme mọi role page.

### File mới

- `src/frontend/src/app/(platform)/layout.tsx`: shell layout cũ, main width/nav/footer của foundation.
- `src/frontend/src/app/(platform)/platform/page.tsx`: home foundation cũ; liên kết tổng quan shell tới `/platform`, wordmark về `/`.
- `src/frontend/src/components/landing/landing-page.tsx`: header, narrative text, workspace preview, CTA/footer bằng HTML semantic.
- `src/frontend/src/components/landing/scroll-frame-story.tsx`: client owner của canvas/progress/loading/resize/disposal.
- `src/frontend/src/components/landing/frame-sequence.ts`: progress-to-index, bounded loading và cache; không chứa copy UI.
- `src/frontend/src/components/landing/landing.css`: layout full-bleed, sticky, masks, responsive và reduced-motion, scope `.landing`.
- `src/frontend/scripts/generate-landing-frames.mjs`: pipeline FFprobe/FFmpeg, kiểm tra input và sinh manifest/assets; chạy thủ công, không chạy khi request hoặc npm build.
- `src/frontend/public/landing/phe-la/{desktop,mobile}/frame-0001.webp`: chuỗi asset theo cấu hình sinh thực tế.
- `src/frontend/public/landing/phe-la/manifest.json`: metadata, profile, count, source timestamps và chapter ranges.
- `src/frontend/public/landing/phe-la/poster.webp`: ảnh đầu phù hợp hero, hiện trước canvas/no-JS.
- `src/frontend/public/landing/phe-la/chapters/{ingredients,process,drink}.webp`: fallback chapter đã chọn từ nguồn.
- `src/frontend/public/fonts/google-sans.woff2` và `src/frontend/public/fonts/google-sans-license.txt`: font chính thức, có tiếng Việt và license tương ứng.

Tên asset/schema cố định; count/dimensions do generator ghi, không hard-code số ảnh vào component.

## 5. Phase 1 — Media và font

- [ ] Dùng FFprobe xác nhận metadata; dò shot boundaries và kiểm tra frame sát điểm cắt. Mốc theo giây đã xem chỉ là bằng chứng hướng nội dung, không đủ để chốt cut chính xác.
- [ ] Lấy đoạn nguyên liệu đến thành phẩm; không đưa outro logo/slogan riêng vào trải nghiệm chính. Generator nhận start/end theo giây và chapter timestamps đã xác nhận; giữ nguyên video nguồn.
- [ ] Xuất frame **Full HD 1920×1080** cho cả desktop và mobile, giữ nguyên tỷ lệ và độ phân giải nguồn; không downscale thành 1600px hoặc 960px. Thử desktop 24fps, WebP quality 78; mobile 16fps, quality 72. FPS và quality là điểm khởi đầu cần đo; Full HD là yêu cầu cố định của người dùng.
- [ ] Sinh poster/chapter fallback và manifest. Đếm ảnh thực tế; chapter index ánh xạ từ timestamp sau resample, không từ source 50fps.
- [ ] Kiểm tra visual đoạn mẫu có tay chuyển động và đoạn đổi shot. Nếu giật do sampling, tăng fps ở cùng phạm vi; nếu nặng, tối ưu nén, FPS và tải theo nhu cầu, không giảm độ phân giải 1920×1080. Không âm thầm thay sequence bằng video autoplay.
- [ ] Lấy Google Sans từ https://fonts.google.com/specimen/Google+Sans ; kiểm tra distribution/license và glyph tiếng Việt; self-host để build không phụ thuộc tải font mạng.
- [ ] Ghi thông số generator, dung lượng compressed, số frame và license vào frontend README. Nếu font đúng chưa lấy được, nêu prerequisite, không gọi font thay thế là Google Sans.

Generator command từ root:

```text
node src/frontend/scripts/generate-landing-frames.mjs --source docs/videos/tvc-phe-la.mp4 --output src/frontend/public/landing/phe-la
```

Generator phải dừng với lỗi rõ nếu thiếu ffmpeg/ffprobe/input; không ghi đè video nguồn. Với asset dir có sẵn, chỉ thay output do chính generator quản lý; không xóa asset khác.

**Gate:** Hai profile có manifest nhất quán; mọi frame xuất đúng 1920×1080; frame đầu/cuối và chapter frames đúng nguồn; font có tiếng Việt. Lưu visual kiểm tra mẫu trong thư mục plan nếu cần.

## 6. Phase 2 — Route cutover và landing tĩnh hoàn chỉnh

- [ ] Tách root layout khỏi foundation wrapper; di chuyển role pages bằng route group, giữ nguyên URL.
- [ ] Chuyển home foundation sang `/platform`; sửa liên kết Tổng quan của shell về `/platform`.
- [ ] Dựng đủ header → hero → ba chương → workspace → CTA → footer trước motion, có anchors/focus/mobile nav.
- [ ] Landing không gọi gateway; giữ health/status trong platform page. Không đụng backend business.
- [ ] Scope NoirLuxe vào landing, Google Sans cho landing. Heading dùng clamp khoảng 40–80px desktop và 32–48px mobile; body 16–18px, line-height ít nhất 1.5; kiểm tra wrap tiếng Việt.
- [ ] Native HTML text tồn tại ngay cả khi canvas hoặc JS không chạy. Poster và chapter fallback luôn có đường render.
- [ ] Preview HTML trung thực, có nhãn minh họa; tất cả CTA có đích thực và không tự điều hướng.

**Gate:** Trang đọc đầy đủ không JS; không double header/footer; `/platform`, `/admin`, `/rnd`, `/viewer`, `/api/health` còn truy cập được. Kiểm tra các URL role là shell, không tuyên bố auth thật.

## 7. Phase 3 — Scroll-driven frame sequence

### Progress contract

Desktop story track cao khởi đầu 500svh, sticky viewport 100svh; tinh chỉnh sau smoke, không dùng wheel preventDefault. Hero và ba chương ở cùng track để không lặp một video ở nhiều section.

```text
scrollable = trackHeight - viewportHeight
progress = scrollable > 0 ? clamp(-trackTop / scrollable, 0, 1) : 0
index = round(progress * (frameCount - 1))
```

Progress chapters ban đầu: hero 0–0.12, nguyên liệu 0.12–0.34, chế biến 0.34–0.72, thành phẩm 0.72–1. Frame mapping dùng chapter ranges từ manifest và piecewise interpolation để chữ đi đúng shot; không giả định chia thời lượng video đều.

### Runtime tasks

- [ ] Scroll listener passive chỉ ghi vị trí và schedule một requestAnimationFrame; vẽ khi index hoặc viewport đổi. Không setState React cho mỗi frame, không vòng RAF vô hạn lúc đứng yên.
- [ ] Load poster trước; bắt đầu frame loading khi track gần viewport. Fetch frame đầu/target ưu tiên, sau đó lân cận; tối đa 4 request đồng thời.
- [ ] Cache decoded images tối đa 12 desktop / 8 mobile ban đầu; dispose ImageBitmap khi eviction và unmount. Không preload/decode toàn bộ sequence.
- [ ] Scroll nhanh nhảy tới target frame ngay khi tải xong, không phát bù tất cả frame trung gian. Giữ frame gần nhất đã tải/poster khi chờ; completion cũ không được kéo canvas về target cũ.
- [ ] Clamp hai đầu; cuộn ngược chọn frame lùi; anchor jump/direct refresh giữa trang vẫn chọn đúng target.
- [ ] ResizeObserver tính crop theo container; DPR cap 1.5 ban đầu; orientation/profile change không trộn cache giữa hai profile.
- [ ] Draw cover/contain theo vị trí chủ thể đã kiểm tra. Mobile không ép center-crop làm mất tay/ly; dùng contain hoặc chapter-specific focal point nếu cover không đạt.
- [ ] Heading mask reveal dùng transform/opacity theo chapter progress, giữ text node nguyên vẹn. Không aria-live cho frame; canvas decorative aria-hidden, nội dung chữ accessible.
- [ ] Hết story track release sticky; workspace không bị pin và URL không đổi.
- [ ] Cleanup scroll/resize/media listeners, pending RAF, observers và decoded images.

### Failure/accessibility contract

- prefers-reduced-motion: không request sequence, không sticky dài, chapter ảnh tĩnh và chữ hiện đầy đủ.
- No JS hoặc canvas không khả dụng: poster/chapter HTML đủ câu chuyện và CTA.
- Một frame lỗi: giữ hình tốt gần nhất, vẫn cập nhật text và tiếp tục load target mới; không blank canvas.
- Toàn sequence lỗi: chuyển chapter fallback, bỏ track cao rỗng; workspace/footer vẫn tới được.
- Không có animation tự chạy theo thời gian khi scroll đứng yên; hover/focus nhỏ vẫn được phép.

**Gate:** Cuộn tiến/ngược/nhảy nhanh có hình tương ứng, không giật lùi do race, không scroll trap. Mọi fallback vẫn cho đọc đầy đủ.

## 8. Phase 4 — Kiểm chứng, tích hợp và tài liệu

Không chạy build/lint rải rác giữa các phase; chạy một đợt sau integration. Kiểm chứng chính là browser thật, không test source-text hoặc mock wiring.

### Commands

Tại `src/frontend/`:

```text
npm ci
npm run lint
npm run build
npm start
```

Tại root:

```text
dotnet build src/backend/RecipeHub.sln
docker compose -f infra/compose.yaml config
```

Nếu Docker daemon sẵn sàng, sau sửa context:

```text
docker compose -f infra/compose.yaml build frontend
```

Build backend là kiểm tra theo repo rule, không khẳng định đã thay backend. Container build khác full-stack smoke: không tự chạy publish heartbeat chỉ để nghiệm thu landing.

### Browser smoke bắt buộc

- [ ] Desktop 1440×900: mở `/`, chờ assets, đứng yên 3 giây; frame không tự chạy.
- [ ] Cuộn qua từng chapter, cuộn ngược, nhảy nhanh đầu/cuối; quan sát frame và chữ, URL vẫn `/`.
- [ ] Scroll hết track tới workspace/CTA/footer; không canvas phủ section sau, không padding từ shell.
- [ ] Click anchors, tab toàn nav/CTA, kiểm tra focus và header không che target.
- [ ] Mobile 390×844 và landscape: không horizontal overflow, chủ thể không bị mất, footer tới được, nav dùng được.
- [ ] Reduced-motion: reload, chỉ ảnh tĩnh và chữ; Network không tải chuỗi frame.
- [ ] Disable JS rồi reload: đủ nội dung và anchor navigation.
- [ ] Chặn một frame rồi cả profile asset: fallback hoạt động và không scroll trap.
- [ ] Throttle network, scroll khi ảnh chưa tới; không flicker về frame cũ; cache/request không tăng vô hạn.
- [ ] Reload giữa track, resize, đổi orientation; frame mapping đúng và không canvas trắng.
- [ ] Kiểm tra `/platform`, ba role routes và `/api/health`; foundation không mất.
- [ ] Chụp screenshot hero/chapter/workspace/mobile và quay ngắn scroll tiến/ngược. Ghi kết quả thực tế, không suy từ build thành visual pass.

Performance acceptance: không long task lặp do decode toàn bộ chuỗi; không request toàn bộ frame lúc page load; canvas không render liên tục khi idle; báo compressed media bytes/profile và cache peak. Các giá trị profile ở Phase 1/3 là tuning defaults, không số đo đã đạt.

Permanent regression test chỉ thêm nếu phát hiện invariant khó chứng minh bằng smoke (ví dụ target race khi request trả sai thứ tự); theo test convention hiện hữu nếu có tại thời điểm triển khai. Không thêm test framework chỉ để test copy, className hoặc source wiring.

### Tài liệu sau smoke

- [ ] Cập nhật README root/frontend: frontend path thật, `/platform`, generate command, asset provenance, font license, reduced-motion/failure behavior, verification đã chạy.
- [ ] Cập nhật `docs/DESIGN.md` bằng override landing và motion constraints; giữ rõ scope.
- [ ] Xóa throwaway scripts/temporary media không cần; giữ generator để tái sinh asset.
- [ ] Chỉ sửa reference đường dẫn frontend đã lỗi trong README/Compose; không mở rộng infra hoặc reset database.
- [ ] Commit atomic khi người dùng yêu cầu commit: media; route/theme; cinematic; docs. Không tự commit trong lượt lập plan.

## 9. Acceptance checklist cuối

- [ ] Landing hoàn chỉnh từ header tới footer, cinematic không phải card grid giới thiệu tính năng.
- [ ] Không autoplay video; frame hoàn toàn theo scroll và không chạy khi đứng yên.
- [ ] Có motion reveal từng dòng, story sticky release đúng, cuộn ngược hoạt động.
- [ ] Google Sans thật, tiếng Việt rõ, NoirLuxe đúng scope.
- [ ] Mobile/reduced-motion/no-JS/media failure đều đọc được toàn câu chuyện.
- [ ] Preview nằm trong landing và được ghi là minh họa; không auto-route, fake dashboard hay fake công thức Phê La.
- [ ] Foundation URLs và API health giữ nguyên, gateway status còn ở `/platform`.
- [ ] Frontend build, backend build, browser smoke có evidence; Docker chỉ báo nếu thực sự chạy được.
- [ ] Quyền phân phối media được kiểm tra trước public deployment; demo ghi nguồn không thay thế giấy phép.

## 10. Không làm trong plan này

Recipe CRUD, JWT/auth, formula calculation, approval backend, pricing, AI, upload/storage, deployment public, full redesign role pages, smoothing scroll toàn trang, autoplay hoặc audio. Không cần backend để xem landing.

## Nguồn

- `docs/DESIGN.md` — NoirLuxe hiện có.
- `docs/videos/tvc-phe-la.mp4` và `docs/materials/logo-phe-la/` — nguồn media, giữ nguyên.
- Google Sans: https://fonts.google.com/specimen/Google+Sans — nguồn distribution; kiểm tra license khi lấy asset.
- `../261007-0357-recipehub-platform-foundation/plan.md` — nền tảng và scope trì hoãn nghiệp vụ.
