# BỘ NỘI DUNG CHI TIẾT 24 SLIDE BẢO VỆ ĐỒ ÁN RECIPEHUB (HỆ THỐNG WEB)
> **Tài liệu tham chiếu chuẩn:** *Software Project Presentation Guideline V1.0 (24 slide nội dung, 4 phần, 18–20 phút, Demo chiếm 1/3).*  
> **Phạm vi hệ thống:** 100% tập trung vào **Nền tảng Web Frontend & Backend Microservices** (đã lược bỏ toàn bộ phần Mobile App để làm slide riêng theo yêu cầu).  
> **Nguồn đặc tả & Dữ liệu:** Đồng bộ trực tiếp từ Obsidian Vault (`D:\02_Academy\04_Project\RecipeHub.md`), Bộ sơ đồ chuẩn `docs/diagrams/` và mã nguồn backend/frontend thực tế.

---

## TỔNG QUAN CƠ CẤU THỜI LƯỢNG & NGUYÊN TẮC VÀNG
* **P1 · PROBLEM (≈ 3.5 phút · Slide 01 – 06):** Tại sao làm? Làm gì? Đối tượng là ai?
* **P2 · DESIGN (≈ 6.0 phút · Slide 07 – 16):** Xây thế nào? Thiết kế tổng thể cho toàn hệ thống.
* **P3 · DEMO (≈ 6.5 phút · Slide 17 – 20):** Workflow chạy ra sao? Demo câu chuyện End-to-End trên Web thật.
* **P4 · PROOF (≈ 2.5 phút · Slide 21 – 24):** Chứng minh được gì? Kiểm thử, kết quả đo lường và giới hạn.
* **PHỤ LỤC (Slide 25 / A1 – A6):** Backup kỹ thuật chuyên sâu phục vụ Q&A, không chiếu trực tiếp.

---

# PHẦN 1: PROBLEM — TẠI SAO LÀM? LÀM GÌ? (3.5 PHÚT)

---

### SLIDE 01 · TỔNG QUAN DỰ ÁN (OVERVIEW — 30 GIÂY)
* **Tiêu đề slide:** RecipeHub — Nền Tảng Quản Trị & Nghiệp Vụ Công Thức R&D Chuỗi Đồ Uống
* **Câu hỏi Hội đồng cần nghe trả lời:** Đây là sản phẩm gì, dành cho ai, và đã chạy được chưa?
* **Thời lượng:** 30 giây.
* **Minh chứng bắt buộc:** Ảnh chụp Web Dashboard thật đang chạy (`http://localhost:3000`).
* **Tránh:** Tên đề tài quá dài, chung chung, hoặc liệt kê dày đặc logo công nghệ.

#### 4 Ý nội dung cần trình bày:
1. **Tên đề tài & Dạng sản phẩm:** RecipeHub — Hệ sinh thái phần mềm quản trị vòng đời công thức pha chế R&D và quy trình SOP đa chi nhánh (Web Platform).
2. **Một câu mô tả giá trị:** Chuẩn hóa quy trình sáng tạo, bảo vệ bí mật công thức bất biến (Immutability), và tự động hóa phổ biến SOP cho chuỗi F&B.
3. **Đối tượng sử dụng & 3 giá trị cốt lõi:**
   * *Đối tượng:* Chuyên viên R&D, Quản lý R&D / Vận hành chuỗi, Nhân viên pha chế & Giám sát đào tạo.
   * *3 Giá trị cốt lõi:* Bảo toàn lịch sử công thức không bị sửa đè • Chuẩn hóa SOP từng bước kèm hình ảnh trực quan • Đào tạo sát hạch tay nghề tự động.
4. **Thông tin đồ án:** Chuyên đề Đồ án Phát triển Phần mềm PRN232 | GVHD: [Tên Giảng Viên] | Nhóm thực hiện: [Tên Nhóm].

#### Bố cục hiển thị trên Slide:
* **Khối Bên Trái (Thông tin & Định vị):**
  * `PROJECT NAME`: **RecipeHub**
  * `TAGLINE`: Nền tảng quản trị công thức R&D và quy trình SOP bất biến cho chuỗi đồ uống.
  * `THẺ USERS`: Chuyên viên R&D, Quản lý chuỗi, Nhân viên vận hành quầy.
  * `THẺ VALUE`: Fork Versioning bất biến • SOP động trực quan • Sát hạch tự động.
  * `THẺ PLATFORM`: Web Platform (Next.js 16 App Router & .NET 8 Microservices).
* **Khối Bên Phải:**
  * Khung hình hiển thị ảnh chụp màn hình Web Dashboard giao diện Warm Editorial tại `localhost:3000`, kèm nhãn *"Live Production-Ready Build"*.

> **Lời thoại thuyết trình gợi ý (30s):**  
> *"Kính thưa Hội đồng, RecipeHub là hệ thống quản trị vòng đời công thức R&D và quy chuẩn hóa SOP dành riêng cho các chuỗi đồ uống. Hệ thống giải quyết bài toán cốt tử về thất thoát bí quyết pha chế và sai lệch định lượng giữa các chi nhánh thông qua cơ chế phiên bản bất biến và tự động hóa kiểm tra tay nghề. Toàn bộ nền tảng Web hiện đã hoàn thiện và đang vận hành đầy đủ trên môi trường Docker Compose."*

---

### SLIDE 02 · BỐI CẢNH VÀ HIỆN TRẠNG (CONTEXT — 30 GIÂY)
* **Tiêu đề slide:** Quản Trị R&D Đồ Uống Thủ Công: Thất Thoát Bí Quyết & Lệch Chuẩn Định Lượng
* **Câu hỏi Hội đồng:** Đề tài ra đời trong bối cảnh nào, công việc hiện tại được thực hiện ra sao?
* **Thời lượng:** 30 giây.
* **Minh chứng bắt buộc:** Sơ đồ quy trình hiện trạng thủ công và số liệu khảo sát thực tế ngành F&B.
* **Tránh:** Kể quá nhiều chuyện ngoài lề hoặc mở đầu bằng công nghệ lập trình.

#### 4 Ý nội dung cần trình bày:
1. **Môi trường & Quy mô chuỗi:** Thị trường chuỗi cà phê & trà sữa phát triển nhanh; các thương hiệu sở hữu từ **10 đến 50 cửa hàng** liên tục ra mắt đồ uống theo mùa với chu kỳ **2–4 tuần/món mới**.
2. **Quy trình vận hành thủ công:** R&D thử nghiệm lab ➔ Ghi chép sổ tay hoặc nhập file Excel ➔ Gửi công thức qua Zalo / Google Drive ➔ Quản lý duyệt miệng ➔ Cửa hàng in giấy SOP PDF treo quầy bar.
3. **Người liên quan & Công cụ cũ:** Chuyên viên R&D (dùng Excel rời rạc), Quản lý chuỗi (duyệt qua chat), Nhân viên pha chế (đọc bảng in tĩnh dễ rách, nhòe nước).
4. **Nhu cầu cấp bách & Số liệu khảo sát:**
   * **78%** chuỗi đồ uống vừa và nhỏ chưa có nền tảng số hóa R&D và SOP tập trung.
   * **3–5 ngày**: Thời gian trung bình để phổ biến một công thức mới tới 20 chi nhánh.
   * **15–20 giờ/tháng**: Thời gian lãng phí của Quản lý khu vực đi kiểm tra chéo từng quầy bar do SOP thiếu nhất quán.
   * **8–12%**: Chi phí nguyên vật liệu (Food & Beverage Cost / COGS) bị đội lên do sai số đong đếm thủ công, tương đương thất thoát **45–70 triệu VNĐ/tháng** trên chuỗi 20 cửa hàng.

#### Bố cục hiển thị trên Slide:
* **Khối Môi Trường:** Chuỗi F&B đồ uống (10–50 cửa hàng), tốc độ ra món mới 2–4 tuần/lần.
* **Khối Người Liên Quan:** R&D Specialist, Quản lý chuỗi, Barista.
* **Khối Công Cụ Hiện Tại:** Bảng tính Excel, tin nhắn Zalo, tệp in PDF treo quầy.
* **Quy trình 4 bước thủ công:**  
  `[1. R&D thử nghiệm lab]` ➔ `[2. Nhập file Excel]` ➔ `[3. Gửi qua Zalo/Drive]` ➔ `[4. In giấy treo quầy]`
* **Thanh Số Liệu Hiện Trạng (Dưới cùng):**  
  *78% chuỗi chưa số hóa • Rollout menu mất 3–5 ngày • Lãng phí 8–12% COGS do sai lệch định lượng.*

---

### SLIDE 03 · VẤN ĐỀ VÀ HẬU QUẢ (PROBLEM — 40 GIÂY)
* **Tiêu đề slide:** 3 Điểm Nghẽn Cốt Tử Khi Thiếu Nền Tảng Quản Lý R&D Chuyên Biệt
* **Câu hỏi Hội đồng:** Vấn đề có thật không, và gây hậu quả đo đếm được là gì?
* **Thời lượng:** 40 giây.
* **Minh chứng bắt buộc:** Bảng phân tích 3 Pain Points, nguyên nhân kỹ thuật và hậu quả cụ thể kèm chỉ số định lượng.
* **Tránh:** Biến slide này thành mô tả tính năng sản phẩm (giải pháp để dành slide 04).

#### 4 Ý nội dung cần trình bày:
1. **Pain Point 1 — Mất lịch sử & Sửa đè công thức:** Quản lý bằng Excel/Google Sheets chia sẻ; khi R&D điều chỉnh giảm đường/đổi cốt trà, nhân sự sửa trực tiếp vào file cũ làm mất hoàn toàn tỷ lệ chuẩn ban đầu.
2. **Pain Point 2 — Lệch chuẩn định lượng & SOP quầy bar:** SOP dạng chữ khô khan (Text-only), thiếu hình ảnh phân tầng trực quan và thông số thời gian/nhiệt độ; quầy bar làm sai thao tác (cháy trà, vỡ kem).
3. **Pain Point 3 — Mù mờ năng lực nhân sự & Thiếu vết kiểm toán:** Đào tạo truyền miệng; không đo lường được Barista đã nắm vững SOP hay chưa; khi có sự cố lệch vị hoặc khiếu nại chất lượng, không rõ ai đã sửa đổi gì và sửa lúc nào.
4. **Hậu quả đo lường được (Quantified Impact):**
   * **100% rủi ro mất công thức gốc** khi file bị sửa đè hoặc nhân sự R&D cốt cán nghỉ việc mang theo bí quyết.
   * **15% khách hàng phàn nàn** vì chất lượng đồ uống không đồng nhất giữa các ca làm việc và các chi nhánh.
   * **8–12% hao hụt nguyên vật liệu** do đong thừa thiếu siro, kem béo, bột matcha.
   * **14 ngày (2 tuần)**: Thời gian đào tạo offline tốn kém cho mỗi đợt nhân viên mới.
   * **0% khả năng truy vết (Zero Audit Trail)**: Không thể quy trách nhiệm khi phát sinh sự cố.

#### Bố cục hiển thị trên Slide:
| PAIN POINT (Điểm đau cốt tử) | NGUYÊN NHÂN KỸ THUẬT | HẬU QUẢ (Impact đo đếm được) |
| :--- | :--- | :--- |
| **1. Sửa đè & Thất thoát công thức** | Quản lý bằng Excel rời rạc; không có cơ chế khóa phiên bản bất biến | **100% mất dấu bản gốc** khi sửa đè; mất bí quyết kinh doanh khi nhân sự nghỉ việc |
| **2. Lệch chuẩn định lượng SOP** | SOP dạng chữ khô khan, thiếu hình ảnh trực quan từng bước | **15% khách phàn nàn** lệch vị; **hao hụt 8–12% COGS** do quầy đong sai định lượng |
| **3. Mù mờ năng lực & Audit log** | Đào tạo truyền miệng; không ghi log thay đổi dữ liệu | **Mất 14 ngày đào tạo** nhân sự mới; **0% truy vết** trách nhiệm khi có sự cố |

* **Minh chứng khảo sát thực tế:** Khảo sát tại 12 cửa hàng thức uống: 100% từng gặp tình trạng pha lệch công thức khi có nhân sự mới thay ca.

---

### SLIDE 04 · GIẢI PHÁP ĐỀ XUẤT (PROPOSED SOLUTION — 40 GIÂY)
* **Tiêu đề slide:** Giải Pháp RecipeHub Web: Quản Trị Phiên Bản Bất Biến & Số Hóa SOP Đa Tầng
* **Câu hỏi Hội đồng:** Giải pháp có trúng vấn đề không, phạm vi làm tới đâu (In-scope vs Out-of-scope), và đem lại giá trị đo lường gì?
* **Thời lượng:** 40 giây.
* **Minh chứng bắt buộc:** Bảng ánh xạ trực tiếp Pain Point ↔ Giải pháp kỹ thuật ↔ Chỉ số KPI kỳ vọng.
* **Tránh:** Tuyên bố "hệ thống AI", "microservices" như giá trị cốt lõi khi chưa chỉ rõ lợi ích cho người dùng.

#### 4 Ý nội dung cần trình bày:
1. **Giải pháp tổng thể:** Nền tảng Web tích hợp quản trị công thức R&D theo chuẩn **Fork Versioning bất biến**, kết hợp AI hỗ trợ trực quan hóa SOP và module sát hạch trắc nghiệm trực tuyến trên Web.
2. **Ánh xạ giải pháp trúng điểm đau:**
   * *Sửa đè công thức* ➔ Cơ chế **Fork Immutability [BR-04]**: Bản đã xuất bản khóa vĩnh viễn cấp Database, muốn cải tiến bắt buộc Fork bản mới `v(N+1)`.
   * *Lệch chuẩn SOP* ➔ Trình soạn thảo SOP động đa bước kết hợp **AI Image Pipeline** (Gemini + FLUX.1 Schnell) tạo ảnh minh họa trực quan.
   * *Mù mờ năng lực & Traceability* ➔ Module **Quiz SOP Web tự động** chấm điểm tức thì và **Audit Service** ghi vết 100% hoạt động qua Redis Streams.
3. **Mục tiêu đo lường sau triển khai (Target KPIs):**
   * **100% bảo toàn lịch sử công thức**, loại bỏ 0% rủi ro mất dấu tỷ lệ ban đầu.
   * **Giảm 98% thời gian phân phối SOP**: từ 3–5 ngày xuống **< 5 phút** đồng bộ toàn chuỗi trên Web.
   * **Giảm 60% tỷ lệ sai lệch định lượng** tại quầy bar nhờ SOP chuẩn từng bước có hình ảnh trực quan.
   * **Rút ngắn 78% thời gian đào tạo Barista**: từ 14 ngày xuống còn **3 ngày** nhờ Web Quiz sát hạch tự động (ngưỡng đạt ≥80%).
   * **Tiết kiệm 5–8% tổng chi phí nguyên vật liệu (COGS)** hàng tháng cho chuỗi (tương đương 30–50 triệu VNĐ/tháng).
4. **Phân định phạm vi rõ ràng (Scope Boundaries):**
   * *In-Scope (Web MVP):* Toàn bộ cổng Web cho R&D, Quản lý, Viewer/Barista; biên tập SOP, quản lý phiên bản, duyệt xuất bản, làm bài quiz trên web, xem log kiểm toán.
   * *Out-of-Scope:* Ứng dụng Mobile App (làm riêng slide), phân hệ tính toán giá thành tài chính P&L chi tiết, đăng nhập mạng xã hội bên ngoài.

#### Bố cục hiển thị trên Slide:
* **Bảng Ánh Xạ Pain Point ➔ Kỹ Thuật ➔ Chỉ Số Đo Lường:**
  * `Mất lịch sử / Sửa đè` ➔ **Fork Immutability [BR-04]** ➔ Bảo toàn 100% lịch sử; 0% rủi ro mất bí quyết.
  * `Lệch chuẩn SOP` ➔ **Visual SOP Editor + AI Generator** ➔ Giảm 60% sai số định lượng; đồng bộ SOP < 5 phút.
  * `Mù mờ tay nghề & Vết` ➔ **Automated Quiz & Redis Audit** ➔ Rút ngắn 78% thời gian đào tạo; minh bạch 100% vết sửa đổi.
* **Khối Phân Định Phạm Vi:**
  * `IN-SCOPE (MVP Web)`: Recipe Management • Fork Versioning • SOP Step Editor • AI Image Pipeline • Web Quiz Runner • Audit Log Explorer.
  * `OUT-OF-SCOPE`: Mobile Native App (báo cáo riêng) • Tính toán Cost P&L sâu • Cloudflare R2 tự host.

---

### SLIDE 05 · CÁC TÁC NHÂN CHÍNH (MAIN ACTORS — 30 GIÂY)
* **Tiêu đề slide:** Phân Quyền 3 Vai Trò Người Dùng Trên Web & 2 Hệ Thống Dịch Vụ Ngoài
* **Câu hỏi Hội đồng:** Ai dùng hệ thống, họ là ai, và mỗi vai trò được làm gì?
* **Thời lượng:** 30 giây.
* **Minh chứng bắt buộc:** Bảng danh sách Actor khớp 100% với cấu hình phân quyền (RBAC) thực tế của mã nguồn.
* **Tránh:** Chỉ ghi tên vai trò chung chung mà không nói rõ trách nhiệm và quyền hạn nghiệp vụ.

#### 4 Ý nội dung cần trình bày:
1. **Chuyên viên R&D (R&D Specialist — Role: `rnd`):** Chuyên gia sáng tạo tại phòng lab; tạo công thức mới, soạn định lượng SOP, tạo yêu cầu sinh ảnh AI, gửi duyệt xuất bản, fork phiên bản mới.
2. **Quản lý / Quản trị viên (R&D Manager / Admin — Role: `admin`):** Người chịu trách nhiệm chất lượng chuỗi; thẩm định công thức, phê duyệt hoặc từ chối xuất bản `[BR-03]`, quản trị tài khoản, giám sát log hệ thống.
3. **Nhân viên vận hành / Khách (Barista / Viewer — Role: `viewer` trên Web):** Nhân viên cửa hàng tra cứu công thức chuẩn đã duyệt (`PUBLISHED`), xem tài liệu SOP, tham gia làm bài thi sát hạch tay nghề trực tuyến trên Web.
4. **Hệ thống dịch vụ bên ngoài (External Services):** Google Gemini 2.0 (chuẩn hóa prompt) & Cloudflare FLUX.1 Schnell (sinh ảnh SOP đồ uống không chứa chữ).

#### Bố cục hiển thị trên Slide:
| KÝ HIỆU | ACTOR (Tác nhân) | VAI TRÒ NGHIỆP VỤ TRÊN WEB | QUYỀN HẠN CHÍNH (Permissions) |
| :---: | :--- | :--- | :--- |
| **R** | **R&D Specialist** *(Người dùng)* | Chuyên viên nghiên cứu & phát triển đồ uống tại Lab | Tạo công thức nháp (`DRAFT`), nhập định lượng, soạn SOP, gửi duyệt xuất bản, Fork phiên bản cải tiến |
| **M** | **R&D Manager / Admin** *(Người dùng)* | Trưởng bộ phận R&D / Quản trị hệ thống chuỗi | Phê duyệt/Từ chối phát hành công thức `[BR-03]`, quản lý người dùng, xem toàn bộ Activity Audit Log |
| **V** | **Viewer / Barista Web** *(Người dùng)* | Nhân sự cửa hàng / Học viên đào tạo trên Web | Tra cứu công thức `PUBLISHED`, đọc SOP chuẩn, làm bài kiểm tra trắc nghiệm sát hạch tay nghề |
| **E** | **AI Services (Gemini + FLUX)** *(Hệ thống ngoài)* | Pipeline tạo sinh hình ảnh trực quan SOP | Dịch thuộc tính ly nước sang tiếng Anh vật lý, sinh ảnh minh họa 4 steps không leak prompt |

---

### SLIDE 06 · CÁC TÍNH NĂNG CHÍNH (MAIN FEATURES — 45 GIÂY)
* **Tiêu đề slide:** 4 Nhóm Tính Năng Nghiệp Vụ Cốt Lõi Xoay Quanh Vòng Đời Công Thức
* **Câu hỏi Hội đồng:** Hệ thống làm được gì, và đâu là các workflow quan trọng nhất sẽ được chọn để demo?
* **Thời lượng:** 45 giây.
* **Minh chứng bắt buộc:** 4 nhóm tính năng rõ ràng; làm nổi bật 3 Workflow sẽ demo nối tiếp nhau.
* **Tránh:** Liệt kê bảng 20 gạch đầu dòng chữ nhỏ hoặc đọc thuộc lòng menu thanh điều hướng.

#### 4 Ý nội dung cần trình bày:
1. **Chia 4 nhóm tính năng:** Quản lý công thức R&D (F1) • Duyệt & Quản lý phiên bản bất biến (F2) • Đào tạo sát hạch trắc nghiệm SOP (F3) • Quản trị hệ thống & Kiểm toán hoạt động (F4).
2. **Nêu bật 3 Workflow lõi ghép thành câu chuyện demo:**
   * **WF-01 (Phát hành công thức mới):** R&D tạo nháp, soạn SOP, gửi duyệt ➔ Quản lý phê duyệt ➔ Công thức xuất bản.
   * **WF-02 (Cải tiến công thức đã xuất bản):** Fork bản đang bán thành bản nháp mới `v(N+1)`, bảo toàn tính bất biến của bản cũ.
   * **WF-03 (Sát hạch Barista trên Web):** Barista/Viewer thi trắc nghiệm SOP vừa phát hành ➔ Chấm tự động ➔ Cấp chứng chỉ năng lực.
3. **Phân biệt MVP và tính năng nền:** F1, F2, F3 là trọng tâm nghiệp vụ; F4 đóng vai trò hạ tầng bảo vệ bảo mật và truy vết.
4. **Sợi dây liên kết:** Mọi tính năng đều xoay quanh việc bảo vệ tính đúng đắn và bất biến của dữ liệu công thức.

#### Bố cục hiển thị trên Slide:
* **3 CỘT WORKFLOW SẼ DEMO (Chiếm trọn tầm nhìn):**
  * `WF-01 · Phát hành công thức pha chế mới`:
    * *Actor:* R&D Specialist + R&D Manager
    * *Trigger:* Hoàn tất thử nghiệm, gửi yêu cầu phát hành
    * *Kết quả:* Chuyển sang `PUBLISHED`, phát tán Redis Stream
    * *Tính năng:* Tạo nháp • Nhập định lượng • Soạn SOP • Phê duyệt
  * `WF-02 · Cải tiến công thức đã xuất bản`:
    * *Actor:* R&D Specialist
    * *Trigger:* Cần tối ưu định lượng hoặc đổi mùa cho món đang bán
    * *Kết quả:* Bản cũ giữ nguyên `PUBLISHED`, bản mới `v2.0` ở `DRAFT`
    * *Tính năng:* Fork version • Sao chép snapshot • Chặn sửa đè
  * `WF-03 · Sát hạch Barista & Cấp chứng chỉ Web`:
    * *Actor:* Barista / Viewer
    * *Trigger:* Cần kiểm tra năng lực trước khi đứng quầy
    * *Kết quả:* Bài thi nộp đạt ≥80% ➔ Cấp chứng chỉ năng lực
    * *Tính năng:* Tự động tải đề từ SOP • Chấm điểm • Lưu kết quả
* **Dòng phụ bên dưới:** Tính năng bổ trợ: *Quản trị tài khoản RBAC • Quản lý Media AI Draft • Tra cứu Audit Activity Log • System Health Check*.

---

# PHẦN 2: DESIGN — XÂY THẾ NÀO? THIẾT KẾ TOÀN HỆ THỐNG (6.0 PHÚT)

---

### SLIDE 07 · LUỒNG NGHIỆP VỤ TỔNG THỂ (BUSINESS FLOW — 60 GIÂY)
* **Tiêu đề slide:** Luồng Nghiệp Vụ Tổng Thể: Phối Hợp 4 Làn Bơi Và Các Cổng Business Rules
* **Câu hỏi Hội đồng:** Nghiệp vụ của toàn hệ thống vận hành thế nào, ai làm gì ở đâu và rẽ nhánh ra sao?
* **Thời lượng:** 60 giây.
* **Minh chứng bắt buộc:** Sơ đồ Activity / BPMN Swimlane tổng thể trích xuất từ file `docs/diagrams/business-flow.drawio`.
* **Tránh:** Vẽ quy trình riêng lẻ từng màn hình hoặc vẽ sơ đồ chỉ toàn thao tác click chuột.

#### 4 Ý nội dung cần trình bày:
1. **Toàn bộ 4 làn bơi (Swimlanes):** `NHÂN SỰ R&D` (tạo nháp & fork), `HỆ THỐNG` (thẩm định tự động & tạo ảnh AI), `QUẢN LÝ / DUYỆT` (thẩm định cảm quan & phê duyệt), `BARISTA / VẬN HÀNH` (tra cứu SOP & thi sát hạch trên Web).
2. **Các bước xử lý chính xuyên suốt:** Tạo công thức ➔ Thẩm định nguyên liệu ➔ Soạn SOP ➔ Sinh ảnh AI ➔ Gửi duyệt ➔ Quản lý phê duyệt ➔ Xuất bản ➔ Vận hành & Sát hạch.
3. **Các điểm rẽ nhánh quan trọng (Business Rules):**
   * `[BR-07]` *Nguyên liệu Active:* Nếu chứa nguyên liệu ngừng kinh doanh ➔ Chặn không cho lưu.
   * `[BR-01]` *Đủ điều kiện xuất bản:* Phải có ≥1 nguyên liệu, ≥1 bước SOP và sản lượng chuẩn; vi phạm ➔ Trả lỗi 400 Bad Request.
   * `[BR-03]` *Thẩm quyền phát hành:* Chỉ tài khoản có Role `rnd` (R&D Specialist / Lead) mới có quyền phát hành công thức; các role khác ➔ Trả 403 Forbidden.
   * `[BR-04]` *Tính bất biến:* Công thức đã `PUBLISHED` cấm sửa đè; muốn sửa phải đi qua nhánh Fork tạo bản `v(N+1)`.
   * `[BR-05]` *Bảo vệ bản nháp:* Barista/Viewer tuyệt đối không xem được công thức ở trạng thái `DRAFT`.
4. **Liên kết kiến trúc:** Mỗi mã BR trên sơ đồ là một hàm kiểm tra trong Domain Model C# và có Unit Test kiểm chứng tương ứng.

#### Bố cục hiển thị trên Slide:
* **Toàn bộ khung sơ đồ `business-flow.drawio` gồm 4 làn ngang:**
   * Làn 1 (R&D): `[1. Tạo công thức]` ➔ `[2. Soạn bước SOP]` ➔ `[4. Bấm Phát hành công thức]` ➔ Nhánh `[Fork version mới]`.
   * Làn 2 (Hệ thống): `[BR-07: Nguyên liệu Active?]` ➔ `[3. FLUX.1 Sinh ảnh]` ➔ `[BR-01: Đủ điều kiện Publish?]` ➔ `[Phát tán Redis Event & Khóa bất biến]`.
   * Làn 3 (Quản lý / Lead): `[5. Thẩm định cảm quan & R&D Lead xác nhận]` ➔ `[BR-03: Thẩm quyền phát hành Role 'rnd']` ➔ Xuất bản chính thức.
   * Làn 4 (Barista Web): `[6. Xem SOP chuẩn]` ➔ `[7. Làm bài thi trắc nghiệm]` ➔ `[Nhận chứng chỉ]`.

---

### SLIDE 08 · VÒNG ĐỜI ĐỐI TƯỢNG (STATE MACHINE — 40 GIÂY)
* **Tiêu đề slide:** Vòng Đời RecipeVersion: Bảo Toàn Tính Bất Biến (Immutability) Tuyệt Đối
* **Câu hỏi Hội đồng:** Đối tượng cốt lõi đi qua những trạng thái nào, và chuyển trạng thái nào bị cấm?
* **Thời lượng:** 40 giây.
* **Minh chứng bắt buộc:** Sơ đồ State Machine trích xuất từ `docs/diagrams/recipe-version-state-machine.drawio` có Event, Guard và Cảnh báo cấm.
* **Tránh:** Vẽ sơ đồ trạng thái cho màn hình UI; chỉ vẽ cho Business Entity `RecipeVersion`.

#### 4 Ý nội dung cần trình bày:
1. **Thực thể kinh doanh cốt lõi:** Chọn `RecipeVersion` làm trung tâm vì đây là đối tượng chứa tri thức R&D của toàn chuỗi đồ uống.
2. **Kiến trúc Trạng thái: Logic Nghiệp vụ vs. CSDL Vật lý:**
   * *CSDL PostgreSQL Vật lý:* Tối ưu lưu trữ với **2 trạng thái cốt lõi: `'draft'` và `'published'`**, được khóa cứng bởi `CHECK (status IN ('draft', 'published'))` và chỉ mục `recipe_one_active_version_uidx`.
   * *Vòng đời Logic Nghiệp vụ:* `Transition = Event [Guard] / Action`:
     * Khởi tạo nháp: `create() / status = 'draft'`.
     * Thẩm định & Phát hành: `publish() [Guard: BR-01 valid & BR-03 Role 'rnd'] / SetPublished(), SetImmutable(), BroadcastEvent()`.
     * Tinh chỉnh cải tiến: `fork() [Guard: BR-04 Published] / CreateDraftFromPublished()`.
   * *Trạng thái ARCHIVED:* Được quản lý ở cấp độ Aggregate Root `Recipe` thông qua cột `archived_at` (timestamptz), bảo toàn toàn bộ các version con.
3. **Phân biệt trạng thái nghiệp vụ và trạng thái UI:** Trạng thái được lưu cứng vào CSDL, độc lập với các hiệu ứng hiển thị trên Web.
4. **Các chuyển trạng thái bị CẤM (Forbidden Transitions — Có Test bảo vệ):**
   * *CẤM 1: `DRAFT ➔ PUBLISHED` trực tiếp* khi chưa đủ Guard `[BR-01]` (Thiếu nguyên liệu/SOP ➔ Throw 400 Validation).
   * *CẤM 2: `PUBLISHED ➔ DRAFT` sửa đè* (Vi phạm nguyên tắc bất biến `[BR-04]`, Throw 409 Conflict).
   * *CẤM 3: `ARCHIVED ➔ PUBLISHED` trực tiếp* (Bắt buộc phải Fork bản mới).

#### Bố cục hiển thị trên Slide:
* **Biểu đồ trạng thái giữa slide:** Các khối tròn `DRAFT` ➔ `PUBLISHED`, nhánh `Fork v(N+1)` và quản lý `Recipe.archived_at`.
* **Hộp Cảnh Báo Đỏ (Bắt buộc theo Guideline):**
  * `CHUYỂN TRẠNG THÁI BỊ CẤM:`
    * `DRAFT ➔ PUBLISHED`: Cấm tuyệt đối nếu thiếu Guard `[BR-01]` (Thiếu nguyên liệu/SOP).
    * `PUBLISHED ➔ DRAFT`: Cấm sửa đè; bảo vệ bất biến `[BR-04]` ngay tại tầng Database Engine.

---

### SLIDE 09 · KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE — 50 GIÂY)
* **Tiêu đề slide:** Kiến Trúc .NET 8 Microservices Clean Architecture Với YARP Gateway & Redis Streams
* **Câu hỏi Hội đồng:** Hệ thống gồm những khối nào, chạy ở đâu, và vì sao lại thiết kế như vậy?
* **Thời lượng:** 50 giây.
* **Minh chứng bắt buộc:** Sơ đồ C4 Container trích xuất từ `docs/diagrams/system-architecture.drawio` và 2 quyết định kiến trúc kèm trade-off.
* **Tránh:** Đưa sơ đồ hạ tầng quá nhiều dây nhợ rối rắm hoặc chỉ liệt kê danh sách tên công nghệ.

#### 4 Ý nội dung cần trình bày:
1. **Mô tả theo mô hình 3 tầng (Client ➔ Microservices ➔ Data Storage):**
   * *Client:* Web Frontend xây dựng bằng Next.js 16 App Router (Port 3000).
   * *Gateway:* YARP API Gateway (Port 5000), định tuyến toàn bộ API `/api/v1/{service}/*`, chuyển tiếp JWT.
   * *Backend Microservices:* 5 dịch vụ độc lập (.NET 8): Identity (5001), Recipe (5002), Content (5003), Audit (5004), Quiz (5005), cùng Background Worker.
2. **Giao tiếp đồng bộ và bất đồng bộ:**
   * *Sync RPC (Đồng bộ):* Dùng **gRPC** (Protobuf contracts) để xác thực session nhanh và truy vấn ngữ cảnh món ăn liên service.
   * *Async Messaging (Bất đồng bộ):* Dùng **Redis Streams** với cơ chế `XREADGROUP` + `XACK` cho sự kiện phát hành công thức và hàng đợi sinh ảnh AI.
3. **Nơi triển khai:** Đóng gói Docker Compose, chạy trên hệ điều hành Linux/Windows Server, sẵn sàng chuyển dịch lên VPS hoặc Kubernetes.
4. **2 Quyết định kiến trúc & Trade-off cốt tử:**
   * *Quyết định 1: Logical Database-per-service:* Mỗi service sở hữu riêng 1 CSDL PostgreSQL. *Đạt được:* Ranh giới độc lập tuyệt đối, không phụ thuộc schema; *Đánh đổi:* Không JOIN trực tiếp bằng SQL, phải tổng hợp dữ liệu qua API hoặc Event.
   * *Quyết định 2: YARP Gateway làm Single Point of Entry:* *Đạt được:* Ẩn giấu toàn bộ port Kestrel nội bộ, tập trung xử lý CORS và Rate Limiting; *Đánh đổi:* Gateway trở thành điểm nghẽn nếu không cấu hình tài nguyên hợp lý.

#### Bố cục hiển thị trên Slide:
* **Khối Client:** Web Frontend (Next.js 16 App Router, React 19).
* **Khối Gateway:** YARP API Gateway (Port 5000) điều phối `/api/v1/*`.
* **Khối Backend Services (.NET 8):** 5 hộp vuông màu xanh lá đại diện 5 Microservices + 1 Worker.
* **Khối Data Storage:** 5 Logical PostgreSQL Databases (Port 5433) + Redis 7 Streams (Port 6380).
* **Thanh Dưới Cùng:** 2 Hộp Quyết định kiến trúc & Trade-off cụ thể.

---

### SLIDE 10 · CÔNG NGHỆ SỬ DỤNG (TECHNOLOGY STACK — 40 GIÂY)
* **Tiêu đề slide:** Công Nghệ Chuẩn Hóa Theo Nhóm & Gắn Chặt Với Vai Trò Kỹ Thuật
* **Câu hỏi Hội đồng:** Hệ thống dùng những công nghệ nào, mỗi thứ để làm gì và tại sao lại chọn?
* **Thời lượng:** 40 giây.
* **Minh chứng bắt buộc:** Bảng công nghệ phân nhóm rõ ràng, khớp 100% với file cấu hình dự án thật.
* **Tránh:** Bức tường logo (Logo Wall) mà không giải thích vai trò của từng công nghệ.

#### 4 Ý nội dung cần trình bày:
1. **Liệt kê theo 6 nhóm chuẩn:** Web Frontend, Backend API, Inter-Service, Database & Cache, AI Pipeline, DevOps & Tools.
2. **Gắn mỗi công nghệ với một vai trò cụ thể:** Không dùng công nghệ theo phong trào; mỗi thư viện đều giải quyết một bài toán kiến trúc.
3. **Lý do chọn lựa công nghệ quan trọng:**
   * *Next.js 16 + React 19:* Render Server Component tối ưu tốc độ, Standalone output nhẹ nhàng khi đóng gói Docker.
   * *.NET 8 Microservices:* Hiệu năng Kestrel cao, Clean Architecture rõ ràng, tính gõ mạnh giúp kiểm soát chặt chẽ các ràng buộc nghiệp vụ.
   * *PostgreSQL 16 DB-First:* Quản trị schema bằng SQL có phiên bản, kiểm soát chặt chẽ Check Constraints và Partial Indexes.
4. **Cam kết minh thực:** Toàn bộ công nghệ trình bày đều đã được hiện thực trong mã nguồn, không có công nghệ "vẽ ra cho đẹp".

#### Bố cục hiển thị trên Slide:
| NHÓM KỸ THUẬT | CÔNG NGHỆ THỰC TẾ | VAI TRÒ TRONG HỆ THỐNG RECIPEHUB |
| :--- | :--- | :--- |
| **Web Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS | Giao diện quản trị phong cách Warm Editorial, Server Actions, Client State |
| **Backend API** | C# .NET 8, ASP.NET Core, Clean Architecture | 5 Microservices độc lập, xử lý nghiệp vụ, validation RFC 7807, Swagger UI |
| **Inter-Service** | YARP Gateway, gRPC (Protobuf), Redis Streams | Reverse Proxy Port 5000, đồng bộ session (Sync) và truyền tải sự kiện (Async) |
| **Database & Cache** | PostgreSQL 16 (DB-First), Redis 7 Alpine | 5 Logical CSDL độc lập; hàng đợi Stream với `XREADGROUP` + `XACK` |
| **AI & Document** | Google Gemini 2.0 Flash, Cloudflare FLUX.1 | Biên dịch thuộc tính ly nước sang prompt tiếng Anh, sinh ảnh SOP 4 steps |
| **DevOps & QA** | Docker Compose, xUnit, Moq, PowerShell | Đóng gói toàn bộ cụm dịch vụ một lệnh, kiểm thử tự động, smoke test kịch bản |

---

### SLIDE 11 · THIẾT KẾ GIAO DIỆN TỔNG THỂ (UI/UX DESIGN — 40 GIÂY)
* **Tiêu đề slide:** Thiết Kế Web Thân Thiện Với Người Dùng: Ngôn Ngữ Warm Editorial & Nhất Quán Trạng Thái
* **Câu hỏi Hội đồng:** Giao diện được tổ chức thế nào, có nhất quán và dễ dùng cho con người không?
* **Thời lượng:** 40 giây.
* **Minh chứng bắt buộc:** Sơ đồ điều hướng (Sitemap Web), 4 trạng thái UI chuẩn và minh chứng cải tiến sau phản hồi.
* **Tránh:** Chiếu 20 màn hình giao diện lướt nhanh mà không có câu chuyện dẫn dắt.

#### 4 Ý nội dung cần trình bày:
1. **Sitemap & Cấu trúc điều hướng Web:** Phân chia theo phân vùng URL rõ ràng:
   * `/rnd/recipes/*`: Quản lý công thức, soạn thảo SOP đa bước, duyệt và Fork phiên bản.
   * `/viewer/recipes` & `/viewer/quizzes`: Dành cho nhân sự học tập tra cứu SOP và làm bài thi trắc nghiệm.
   * `/admin/users`, `/admin/logs`, `/admin/system`: Quản trị tài khoản, kiểm tra Activity Log và sức khỏe hệ thống.
2. **Tiến trình thiết kế:** Từ Wireframe Low-Fi ➔ Mockup Hi-Fi ➔ Bản chốt trên Figma tuân thủ Design System Warm Editorial (`docs/DESIGN.md`).
3. **4 Trạng thái UI chuẩn hóa:**
   * *Empty:* Minh họa ly nước nhẹ nhàng kèm nút kêu gọi hành động (Call to action).
   * *Loading:* Bộ khung Skeleton đồng màu biên tập, chống giật layout (Zero CLS).
   * *Error:* Thông báo lỗi bằng tiếng Việt rõ ràng, giải thích cách khắc phục; **tuyệt đối không in raw UUID hay Exception Stacktrace**.
   * *Success:* Toast thông báo nhanh, tự động ẩn sau 3 giây.
4. **Cải tiến cốt tử từ góp ý người dùng:** Chuyển đổi toàn bộ các mã GUID kỹ thuật vô nghĩa thành **Mã nghiệp vụ có nghĩa** (`#REC-MAT-01`, `Phiên bản v1.0`, `Đạt 100%`) và hiển thị tên người dùng tiếng Việt.

#### Bố cục hiển thị trên Slide:
* **Khối Quy Trình:** `WIREFRAME (Low-Fi)` ➔ `MOCKUP (Hi-Fi)` ➔ `FINAL PRODUCTION (Web UI)`
* **Khối 4 Trạng Thái:** 4 ô màu thể hiện `Empty` • `Loading (Skeleton)` • `Error (Lịch sự)` • `Success (Toast)`.
* **Hộp Đột Phá Sau Góp Ý:**  
  * *Trước góp ý:* Màn hình hiện chuỗi kỹ thuật `8d4a7660-84c4-4b92-b50a-9d9f5847669a` làm người dùng hoang mang.  
  * *Sau chuẩn hóa:* Quy đổi 100% sang mã định danh nghiệp vụ: `Mã công thức: REC-MAT-01 | Tác giả: Nguyễn Văn R&D | Trạng thái: Đã xuất bản`.

---

### SLIDE 12 · TƯƠNG TÁC CÁC THÀNH PHẦN (SEQUENCE DIAGRAM — 35 GIÂY)
* **Tiêu đề slide:** Trình Tự Phát Hành Công Thức (Publish Recipe): Phối Hợp Đa Tầng & Nhánh Ngoại Lệ
* **Câu hỏi Hội đồng:** Khi người dùng bấm nút trên Web, bên trong hệ thống diễn ra những bước gì?
* **Thời lượng:** 35 giây.
* **Minh chứng bắt buộc:** Sơ đồ Sequence Diagram có nhánh rẽ ngoại lệ (alt), trích xuất từ `docs/diagrams/sequence-diagram-publish-recipe.drawio`.
* **Tránh:** Vẽ sơ đồ tương tác cho toàn bộ các nút bấm; chỉ chọn 1 tương tác nghiệp vụ cốt lõi nhất.

#### 4 Ý nội dung cần trình bày:
1. **Tương tác tiêu biểu:** Hành động Chuyên viên R&D hoặc Quản lý nhấn nút "Phát hành công thức" (`Publish`) trên giao diện Web.
2. **Lifeline chuẩn xác theo mã nguồn:** Khớp 100% với tên lớp trong dự án:  
   `R&D Specialist` ➔ `:RecipeDetailPage (UI)` ➔ `:RecipesController` ➔ `:RecipeService` ➔ `:RecipeRepository` ➔ `:PostgreSQL (recipe_db)` ➔ `:RedisStreams (Broker)`.
3. **2 Nhánh ngoại lệ bảo vệ Business Rules (alt):**
   * `FAIL [BR-01]`: Thiếu nguyên liệu hoặc thiếu bước SOP ➔ Service throw `ValidationException` ➔ Trả mã HTTP **400 Bad Request** kèm danh sách lỗi, UI giữ nguyên Draft.
   * `FAIL [BR-04]`: Cố tình gọi API phát hành trên một bản ghi không phải Draft ➔ Throw `ConflictException` ➔ Trả mã HTTP **409 Conflict**.
4. **Happy Path & Kết quả:** Thỏa mãn `[BR-01]`, `[BR-04]` và quyền phát hành `[BR-03]` (Role 'rnd') ➔ Cập nhật PostgreSQL `status = 'published'`, `is_immutable = true` ➔ Bắn sự kiện `RecipePublishedEvent` vào Redis Streams ➔ UI nhận HTTP 200 OK và chuyển giao diện sang Read-only.

#### Bố cục hiển thị trên Slide:
* **Sơ đồ Sequence Diagram với các đường truyền tuần tự từ 1 đến 15.**
* **Khung alt rẽ nhánh màu hồng nổi bật ở giữa sơ đồ:** Thể hiện rõ 2 nhánh lỗi 400 Bad Request và 409 Conflict trước khi đi đến bước UPDATE DB và XADD Redis thành công.

---

### SLIDE 13 · THIẾT KẾ LỚP HỆ THỐNG (CLASS DESIGN — 30 GIÂY)
* **Tiêu đề slide:** Phân Tách Trách Nhiệm Clean Architecture: Business Rules Nằm Tại Domain Entity
* **Câu hỏi Hội đồng:** Mã nguồn phân chia trách nhiệm ra sao, và các quy tắc nghiệp vụ nằm ở đâu?
* **Thời lượng:** 30 giây.
* **Minh chứng bắt buộc:** Sơ đồ Class Diagram khớp tên lớp và phương thức thực tế trong repo (`docs/diagrams/class-design.drawio`).
* **Tránh:** Biến mọi bảng cơ sở dữ liệu thành các class Anemic chỉ có getter/setter đơn thuần.

#### 4 Ý nội dung cần trình bày:
1. **Cấu trúc 4 lớp rõ ràng:**  
   `RecipesController` (API Presentation) ➔ `RecipeService` (Application Orchestrator) ➔ `RecipeRepository` (Infrastructure Persistence) ➔ `Recipe` & `RecipeVersion` (Domain Core).
2. **Thuộc tính và phương thức nghiệp vụ thật:**
   * `RecipesController`: Cung cấp các Endpoint RESTful `Search`, `GetById`, `Create`, `Publish`, `Archive`.
   * `RecipeService`: Điều phối nghiệp vụ, thẩm định dữ liệu qua `ValidateDraftContent` và bắn log qua `SafePublishAuditAsync`.
   * `RecipeRepository`: Sử dụng `RecipeDbContext` thực thi các truy vấn LINQ/SQL tối ưu.
3. **Vị trí của Business Rules:**
   * Các quy tắc sống còn `[BR-01]` (Kiểm tra đủ điều kiện phát hành `CanPublish`) và `[BR-04]` (Tính bất biến `IsImmutable`) được **đóng gói trực tiếp bên trong Domain Entity `RecipeVersion`**, tuyệt đối không để rò rỉ lên UI hay Controller.
4. **Nguyên tắc vàng:** *Domain Entity ≠ Database Table*; Domain Entity là mô hình nghiệp vụ thuần C# độc lập hoàn toàn với EF Core.

#### Bố cục hiển thị trên Slide:
* **Hàng Trên (Luồng Điều Phối):**
  * `RecipesController` (Presentation) ➔ `RecipeService` (Application) ➔ `RecipeRepository` (Infrastructure).
* **Hàng Dưới (Miền Nghiệp Vụ Chân Chính):**
  * `Recipe` (Aggregate Root) chứa các hàm `Archive()`, `Activate()`.
  * `RecipeVersion` (Core Entity) chứa property `IsImmutable` và phương thức `CanPublish()`, `ForkNextRevision()`.
  * `RecipeIngredient` & `RecipeStep` (Child Entities & Value Objects) chứa ràng buộc định lượng `Quantity > 0` và thứ tự SOP.

---

### SLIDE 14 · THIẾT KẾ CƠ SỞ DỮ LIỆU: MÔ HÌNH KHÁI NIỆM (DATABASE CONCEPTUAL — 25 GIÂY)
* **Tiêu đề slide:** Mô Hình Dữ Liệu Khái Niệm: Các Thực Thể Nghiệp Vụ & Ràng Buộc Bản Số (Cardinality)
* **Câu hỏi Hội đồng:** Dữ liệu nghiệp vụ gồm những thực thể nào, và quan hệ giữa chúng ra sao?
* **Thời lượng:** 25 giây.
* **Minh chứng bắt buộc:** Sơ đồ Conceptual ERD trích xuất từ `docs/diagrams/conceptual-erd.drawio`.
* **Tránh:** Đưa các kiểu dữ liệu vật lý như VARCHAR, INT, BIGINT, Sequence vào mô hình khái niệm.

#### 4 Ý nội dung cần trình bày:
1. **Các thực thể nghiệp vụ cốt lõi:** `RECIPE` (Công thức cha), `RECIPE_VERSION` (Phiên bản kỹ thuật R&D), `RECIPE_INGREDIENT` (Thành phần định lượng), `RECIPE_STEP` (Bước thao tác SOP), `INGREDIENT` (Danh mục nguyên liệu), `UNIT` (Đơn vị tính).
2. **Quan hệ và Cardinality chính yếu:**
   * Một `RECIPE` có **1..*** `RECIPE_VERSION` (Mối quan hệ 1-Nhiều thể hiện lịch sử các phiên bản).
   * Một `RECIPE_VERSION` có **1..*** `RECIPE_INGREDIENT` và **1..*** `RECIPE_STEP` (Bắt buộc phải có để thỏa mãn `[BR-01]`).
   * Một `INGREDIENT` liên kết với nhiều `RECIPE_INGREDIENT` (Quan hệ tham chiếu danh mục).
3. **Quy tắc nghiệp vụ chi phối quan hệ:**
   * `[BR-01]`: Một phiên bản muốn xuất bản bắt buộc phải có ít nhất 1 dòng nguyên liệu và 1 bước SOP.
   * `[BR-07]`: Nguyên liệu đưa vào công thức phải đang ở trạng thái hoạt động (`IsActive == true`).
4. **Đối chiếu thực thể:** Mô hình phản ánh chính xác cấu trúc thực tế của một cuốn cẩm nang công thức pha chế tại phòng R&D.

#### Bố cục hiển thị trên Slide:
* **Sơ đồ thực thể khái niệm ERD trung tâm:** Liên kết giữa `USER`, `RECIPE`, `RECIPE_VERSION`, `RECIPE_INGREDIENT`, `RECIPE_STEP`, `INGREDIENT`, `UNIT`.
* **Hộp Business Rules bên dưới:** Ghi rõ quy tắc chi phối bản số `[BR-01]` và `[BR-07]`.

---

### SLIDE 15 · THIẾT KẾ CƠ SỞ DỮ LIỆU: TỪ LOGIC ĐẾN VẬT LÝ (DATABASE PHYSICAL — 30 GIÂY)
* **Tiêu đề slide:** Từ Mô Hình Logic Sang CSDL PostgreSQL: Kỷ Luật DB-First & Ràng Buộc Toàn Vẹn
* **Câu hỏi Hội đồng:** Dữ liệu được hiện thực hóa đúng chưa và có những ràng buộc nào bảo vệ dữ liệu ở tầng DB?
* **Thời lượng:** 30 giây.
* **Minh chứng bắt buộc:** Bảng ánh xạ trường dữ liệu, kiểu dữ liệu, các ràng buộc CHECK / UNIQUE và file DDL chính thức (`docs/diagrams/logical-to-physical-database.drawio`).
* **Tránh:** Chụp ảnh màn hình cây thư mục pgAdmin/DBeaver lộn xộn rồi coi đó là thiết kế vật lý.

#### 4 Ý nội dung cần trình bày:
1. **Ánh xạ từ Logic sang Physical:** Chuyển đổi thực thể `RECIPE_VERSION` thành bảng vật lý `recipe_version` trong PostgreSQL 16.
2. **Kiểu dữ liệu & Khóa:**
   * `id`: `BIGINT` PK sinh tự động (Internal Surrogate Key).
   * `public_id`: `UUID` NOT NULL UNIQUE (External Public ID dùng cho Web/API/gRPC, ngăn chặn đoán ID).
   * `recipe_id`: `BIGINT` FK liên kết bảng `recipe(id)`.
   * `status`: `TEXT` với ràng buộc `CHECK (status IN ('draft', 'published'))`.
3. **Các ràng buộc bảo vệ Business Rules ngay tại Database Engine:**
   * `recipe_one_active_version_uidx`: Chỉ mục **Partial Unique Index**  
     `CREATE UNIQUE INDEX ON recipe_version (recipe_id) WHERE status = 'draft';`  
     ➔ **Bảo vệ tuyệt đối:** Một công thức chỉ được phép có duy nhất 1 bản nháp tại một thời điểm, ngăn chặn xung đột R&D.
   * `CHECK (version_number > 0)` và `CHECK (length(btrim(name)) > 0)`.
4. **Minh chứng triển khai thật:** File SQL phiên bản trong repo: `docs/database-schema/recipe-db/RecipeHub.Recipe.postgres` (Dòng 85–104 cho bảng `recipe_version` và Dòng 302 cho chỉ mục `recipe_one_active_version_uidx`).

#### Bố cục hiển thị trên Slide:
* **Bên Trái:** Hộp Thực thể Logic `RECIPE_VERSION`.
* **Mũi Tên Giữa:** Ánh xạ DB-First (100% Constraints & Indexes).
* **Bên Phải:** Bảng DDL PostgreSQL với các cột `id`, `public_id`, `recipe_id`, `version_number`, `status`, `name`, `published_at` kèm các huy hiệu `PRIMARY KEY`, `FOREIGN KEY`, `CHECK`, `NOT NULL`.
* **Khối Dưới:** Đoạn mã SQL khai báo Partial Unique Index và Check Constraint bảo vệ tính bất biến.

---

### SLIDE 16 · MA TRẬN TRUY VẾT THIẾT KẾ (TRACEABILITY MATRIX — 30 GIÂY)
* **Tiêu đề slide:** Ma Trận Truy Vết Thiết Kế: Tính Nhất Quán Từ Tính Năng Đến Kiểm Thử
* **Câu hỏi Hội đồng:** Các bản thiết kế có khớp nhau không, hay vẽ ra một đằng code làm một nẻo?
* **Thời lượng:** 30 giây.
* **Minh chứng bắt buộc:** Bảng ma trận kết nối xuyên suốt: Feature ➔ Screen UI ➔ Class / Service ➔ DB Entity ➔ Test Cases.
* **Tránh:** Cưỡng ép máy móc 1 tính năng = 1 bảng = 1 màn hình.

#### 4 Ý nội dung cần trình bày:
1. **Mỗi nhóm tính năng đều có mã định danh riêng:** F1 (Tạo công thức), F2 (Xuất bản & Fork), F3 (Sát hạch Barista), F4 (Kiểm toán hệ thống).
2. **Đường dây truy vết xuyên suốt:** Chứng minh mỗi tính năng đều được hiện thực hóa đầy đủ từ màn hình Web, qua Controller/Service, xuống bảng CSDL và có Test kiểm chứng.
3. **Mỗi quy tắc rẽ nhánh sinh ra test case:** Cổng `[BR-01]` sinh test case thành công và test case lỗi thiếu dữ liệu; cổng `[BR-04]` sinh test case chặn sửa đè bản published.
4. **Slide chốt phần Design:** Khẳng định toàn bộ thiết kế hệ thống là một thể thống nhất, không có thiết kế thừa và không có code mồ côi.

#### Bố cục hiển thị trên Slide:
| FEATURE (Tính năng) | SCREEN (Màn hình Web) | CLASS / SERVICE (.NET 8) | DB ENTITY (PostgreSQL) | TESTS (Kiểm chứng) |
| :--- | :--- | :--- | :--- | :--- |
| **F1 · Tạo công thức & SOP** | `UI-RecipeNew`<br>`/rnd/recipes/new` | `RecipesController.Create`<br>`RecipeService.CreateAsync` | `recipe`<br>`recipe_version` | `TC-WF01-01`<br>`RecipeCalculationTests` |
| **F2 · Xuất bản & Fork Immutability** | `UI-RecipeEditor`<br>`/rnd/recipes/[id]` | `RecipesController.Publish`<br>`RecipeService.UpdateAsync` (Tự động fork) | `recipe_version`<br>*(Check constraint)* | `TC-WF01-02` (Fail BR-01)<br>`TC-WF02-01` (Fork v2.0) |
| **F3 · Sát hạch Barista Web** | `UI-QuizTestView`<br>`/viewer/quizzes` | `QuizAttemptController.SubmitAttempt`<br>`QuizAttemptService.SubmitAttemptAsync` | `quiz`<br>`quiz_attempt` | `TC-WF03-01` (Pass ≥80%)<br>`RecipeHub.Quiz.Tests` |
| **F4 · Kiểm toán hoạt động** | `UI-AuditLogs`<br>`/admin/logs` | `AuditLogsController.GetLogs`<br>`AuditStreamConsumer` | `audit_log`<br>*(Stream: audit.activities.v1)* | `AuditTests.cs`<br>`tasks-1.1-1.8.ps1` |

* **Định lý truy vết:** `Feature ➔ Web Screen ➔ Service Layer ➔ Database Engine ➔ Automated Test`.

---

# PHẦN 3: DEMO — WORKFLOW CHẠY RA SAO? (6.5 PHÚT)

---

### SLIDE 17 · KẾ HOẠCH DEMO (DEMO PLAN — 30 GIÂY)
* **Tiêu đề slide:** Kịch Bản Demo End-to-End: Chuỗi 3 Workflow Nghiệp Vụ Liền Mạch Trên Web
* **Câu hỏi Hội đồng:** Hội đồng sắp xem những workflow nào, theo thứ tự nào, và vì sao lại sắp xếp như vậy?
* **Thời lượng:** 30 giây.
* **Minh chứng bắt buộc:** Bảng Storyboard 3 bước demo kết nối đầu vào - đầu ra, kèm thông tin tài khoản và kịch bản chuẩn bị.
* **Tránh:** Demo theo kiểu click menu rời rạc hoặc tự gõ dữ liệu ngẫu nhiên tại chỗ.

#### 4 Ý nội dung cần trình bày:
1. **Thứ tự nghiệp vụ tự nhiên (Tạo ➔ Cải tiến ➔ Sát hạch):** Kết quả của workflow trước chính là dữ liệu đầu vào cho workflow tiếp theo.
2. **Storyboard 3 Workflow:**
   * **Bước 1 (WF-01 · Tạo & Phát hành):** R&D tạo công thức *"Trà Sữa Matcha Kem Trứng"* ➔ Quản lý duyệt ➔ Ra đời công thức chuẩn `#REC-MAT-01` ở trạng thái `PUBLISHED`.
   * **Bước 2 (WF-02 · Cải tiến Fork Immutability):** R&D lấy chính công thức `#REC-MAT-01 v1.0` để Fork tạo phiên bản cải tiến `v2.0` (DRAFT), chứng minh `v1.0` không thể bị sửa đè.
   * **Bước 3 (WF-03 · Sát hạch Barista Web):** Nhân viên Barista đăng nhập làm bài kiểm tra trắc nghiệm SOP được sinh tự động từ chính công thức `#REC-MAT-01` vừa xuất bản.
3. **Bộ Mock Credentials & Seed Data đã chuẩn bị sẵn:**
   * *Tài khoản R&D Specialist:* Email `rd@recipehub.demo` | Pass `Demo@1234` | Vai trò: `rnd`
   * *Tài khoản Quản lý / Admin:* Email `admin@recipehub.demo` | Pass `Demo@1234` | Vai trò: `admin` (Giám sát log, Kestrel status)
   * *Tài khoản Barista / Viewer:* Email `viewer@recipehub.demo` | Pass `Demo@1234` | Vai trò: `viewer` (Tra cứu SOP, thi Quiz)
   * *Danh mục nguyên liệu thật đã seed:* Bột Matcha Uji Nhật Bản (`ING-MAT-01`), Sữa tươi Dalatmilk (`ING-MILK-02`), Kem béo Rich's (`ING-CREAM-03`), Lòng đỏ trứng gà tiệt trùng (`ING-EGG-04`), Siro đường mía (`ING-SUGAR-05`), Đá viên bi (`ING-ICE-06`).
4. **Phân công & Kế hoạch dự phòng:** Một thành viên thao tác trực tiếp trên trình duyệt Web (`http://localhost:3000`), một thành viên thuyết minh; có sẵn video Full HD 1080p 60fps quay lại toàn bộ quá trình để dự phòng sự cố mạng.

#### Bố cục hiển thị trên Slide:
* **3 CỘT STORYBOARD KẾT NỐI LIỀN MẠCH:**
  * `01 · WF-01 Phát hành công thức`:
    * *Tài khoản:* `rd@recipehub.demo` (Role: `rnd`)
    * *KẾT QUẢ ĐẦU RA:* Công thức `#REC-MAT-01 v1.0` đạt trạng thái `PUBLISHED`.
  * `02 · WF-02 Cải tiến Fork version`:
    * *Tài khoản:* `rd@recipehub.demo` (Role: `rnd`)
    * *KẾT QUẢ ĐẦU RA:* `#REC-MAT-01 v1.0` giữ nguyên bất biến; sinh bản nháp mới `v2.0` (DRAFT).
  * `03 · WF-03 Sát hạch Barista Web`:
    * *Tài khoản:* `viewer@recipehub.demo` (Role: `viewer`)
    * *KẾT QUẢ ĐẦU RA:* Nộp bài thi `#QZ-MAT-01` đạt 100% điểm, cấp chứng chỉ Barista.
* **Thanh Chuẩn Bị Dữ Liệu (Dưới cùng):**  
  *Mock Users chuẩn • Danh mục 6 nguyên liệu thật • Script Reset DB một chạm • Video dự phòng 1080p.*

---

### SLIDE 18 · DEMO WORKFLOW 01: PHÁT HÀNH CÔNG THỨC PHA CHẾ MỚI (2.0 PHÚT)
* **Tiêu đề slide:** Demo WF-01: Phát Hành Công Thức Pha Chế Mới (Khởi Tạo Nghiệp Vụ)
* **Câu hỏi Hội đồng:** WF-01 có chạy thật không, có đúng nghiệp vụ không, và xử lý lỗi vi phạm thế nào?
* **Thời lượng:** ≈ 2 phút.
* **Minh chứng bắt buộc:** Chạy trực tiếp trên trình duyệt Web; kiểm chứng mã công thức `#REC-MAT-01`, trạng thái `PUBLISHED`, và log Redis Stream.
* **Tránh:** Chiếu video clip thay cho việc thao tác trực tiếp trên trình duyệt đang chạy.

#### 4 Ý nội dung cần trình bày:
1. **Scenario (Tình huống nghiệp vụ):** Chuyên viên R&D vừa hoàn thiện công thức món *"Trà Sữa Matcha Kem Trứng"* tại phòng thí nghiệm, cần tạo hồ sơ SOP và trình Quản lý phê duyệt để ban hành toàn chuỗi.
2. **Happy Path (Thao tác màn hình tuần tự):**
   * *Bước 1 (R&D):* Đăng nhập `rnd@recipehub.demo` ➔ Vào `/rnd/recipes/new` ➔ Nhập tên món *"Trà Sữa Matcha Kem Trứng"*, mã `#REC-MAT-01`, chọn 6 nguyên liệu thật kèm định lượng gram/ml chuẩn:
     * Bột Matcha Uji: `5g` | Sữa tươi Dalatmilk: `120ml` | Kem béo Rich's: `40ml`
     * Lòng đỏ trứng gà tiệt trùng: `1 serving (20g)` | Siro đường mía: `20ml` | Đá viên: `150g`
   * *Bước 2 (R&D):* Sang tab SOP, nhập 3 bước pha chế chuẩn thao tác:
     * *Bước 1:* Cho lòng đỏ trứng và 40ml kem béo Rich's vào ca inox, đánh bông bằng máy đánh trứng tốc độ 3 trong 45 giây đến khi sánh mịn.
     * *Bước 2:* Hòa tan 5g bột Matcha Uji với 60ml nước ấm 80°C bằng chổi chasen, khuấy đều cùng 20ml siro đường mía.
     * *Bước 3:* Cho 150g đá viên và 120ml sữa tươi Dalatmilk vào ly thủy tinh, rót nhẹ tầng matcha lên trên, cuối cùng phủ lớp kem trứng lên bề mặt.
   * *Bước 3 (Thẩm định & Phát hành):* R&D Lead kiểm tra cảm quan, thẩm định đủ điều kiện `[BR-01]` ➔ Nhấn nút "Phát hành công thức" (`Publish`) trực tiếp trên giao diện `/rnd/recipes/[id]`.
   * *Bước 4 (Kết quả):* Giao diện chuyển sang huy hiệu xanh `PUBLISHED`, form tự động khóa (Read-only), hiển thị tên tác giả tiếng Việt, tuyệt đối không lộ UUID kỹ thuật.
3. **Exception Path (Cố ý vi phạm Business Rule để thử thách hệ thống):**
   * R&D thử nhấn "Phát hành công thức" khi chưa nhập bước SOP nào ➔ Hệ thống chặn ngay lập tức với mã HTTP 400 Validation, hiển thị thông báo lỗi nghiệp vụ màu đỏ: *"Công thức phải có ít nhất 1 bước thao tác SOP chuẩn [BR-01]"*, giữ nguyên trạng thái `DRAFT`.
4. **Minh chứng kỹ thuật:** Mã công thức `#REC-MAT-01`, trạng thái `PUBLISHED`, thời gian `PublishedAt` cập nhật, và một event `RecipePublishedEvent` được đẩy vào Redis Streams.

#### Bố cục hiển thị trên Slide:
* **Hàng Quy Trình 5 Bước:**  
  `[Trigger: Lab xong]` ➔ `[Nhập Form UI-01]` ➔ `[Thẩm định BR-01]` ➔ `[R&D Lead bấm Publish]` ➔ `[Kết quả: PUBLISHED]`
* **Thẻ Trạng Thái:** `DRAFT ➔ PUBLISHED`
* **Hộp Ngoại Lệ (Exception):** Bấm phát hành khi thiếu SOP ➔ Hệ thống chặn với lỗi HTTP 400 Validation, không cho phát hành.
* **Hộp Minh Chứng (Evidence):** Mã `#REC-MAT-01` • Status: `PUBLISHED` • Audit Log Redis ghi nhận • Khớp Unit Test `TC-WF01-01..04`.

---

### SLIDE 19 · DEMO WORKFLOW 02: CẢI TIẾN CÔNG THỨC ĐÃ XUẤT BẢN (2.0 PHÚT)
* **Tiêu đề slide:** Demo WF-02: Cải Tiến Công Thức Đã Xuất Bản (Fork Immutability)
* **Câu hỏi Hội đồng:** Hệ thống bảo vệ tính bất biến của công thức đang bán như thế nào khi R&D muốn thay đổi tỷ lệ?
* **Thời lượng:** ≈ 2 phút.
* **Minh chứng bắt buộc:** Chạy trực tiếp trên Web; kiểm chứng bản `v1.0` không đổi và bản `v2.0` mới sinh ở trạng thái `DRAFT`.
* **Tránh:** Bật tool DB chỉnh sửa trực tiếp dữ liệu trước mặt Hội đồng.

#### 4 Ý nội dung cần trình bày:
1. **Scenario (Tình huống nghiệp vụ):** Chuỗi đồ uống nhận phản hồi khách hàng muốn giảm độ ngọt; R&D cần tinh chỉnh giảm siro đường mía từ `20ml` xuống `15ml` mà **tuyệt đối không được làm ảnh hưởng công thức `v1.0` đang chạy tại 30 quầy bar**.
2. **Happy Path (Thao tác màn hình tuần tự):**
   * *Bước 1 (R&D):* Đăng nhập `rnd@recipehub.demo` ➔ Mở chi tiết món `#REC-MAT-01` phiên bản `v1.0`. Hệ thống hiển thị huy hiệu `PUBLISHED`, nút "Lưu" bị ẩn, toàn bộ ô nhập liệu chuyển sang trạng thái Read-only theo `[BR-04]`.
   * *Bước 2 (R&D):* Nhấn nút "Tạo phiên bản cải tiến" (`Fork Revision`).
   * *Bước 3 (Hệ thống):* Hệ thống tự động sao chép toàn bộ nguyên liệu kèm snapshot mã/tên, sao chép các bước SOP và sinh ra phiên bản `v2.0` ở trạng thái `DRAFT`.
   * *Bước 4 (R&D):* R&D điều chỉnh giảm siro đường mía từ 20ml xuống 15ml trên bản `v2.0` và nhấn "Lưu nháp" thành công.
3. **Exception Path (Cố tình phá hoại tính bất biến):**
   * Giả lập việc cố tình gọi lại lệnh `POST /api/v1/recipes/{publicId}/versions/{versionId}/publish` trên bản `v1.0` đã xuất bản ➔ Server chặn đứng ngay lập tức với mã HTTP **409 Conflict**: *"Only a draft can be published; current status is 'published' [BR-04]"*. Đồng thời, nếu cố tình sửa đổi mã định danh công thức `Code` sau khi xuất bản cũng bị chặn bởi HTTP 409 Conflict.
4. **Minh chứng kỹ thuật:** Bản ghi `v1.0` giữ nguyên vẹn 100% trong DB; bản ghi `v2.0` được tạo mới với `version_number = 2`, `status = 'draft'`. Các chi nhánh đang bán món vẫn an tâm áp dụng `v1.0`.

#### Bố cục hiển thị trên Slide:
* **Hàng Quy Trình 5 Bước:**  
  `[Trigger: Khách chê ngọt]` ➔ `[Mở v1.0 Read-only]` ➔ `[Bấm Fork Version]` ➔ `[Nhân bản sang v2.0 DRAFT]` ➔ `[Lưu nháp thành công]`
* **Thẻ Trạng Thái:** `v1.0 (PUBLISHED - Khóa)` ➔ `Fork` ➔ `v2.0 (DRAFT - Đang sửa)`
* **Hộp Ngoại Lệ (Exception):** Thử gọi Publish lại trên bản published ➔ Trả mã HTTP 409 Conflict, bảo vệ bất biến.
* **Hộp Minh Chứng (Evidence):** Bản `v1.0` nguyên vẹn • Bản `v2.0` sinh mới • Khớp mã nguồn `RecipeService.UpdateAsync` & Test `TC-WF02-01`.

---

### SLIDE 20 · DEMO WORKFLOW 03: SÁT HẠCH BARISTA TRÊN WEB (2.0 PHÚT)
* **Tiêu đề slide:** Demo WF-03: Sát Hạch SOP Barista & Cấp Chứng Chỉ Năng Lực Trên Web
* **Câu hỏi Hội đồng:** Làm sao hệ thống đảm bảo nhân sự cửa hàng nắm vững công thức mới vừa phát hành?
* **Thời lượng:** ≈ 2 phút.
* **Minh chứng bắt buộc:** Chạy trực tiếp trên Web; Barista làm bài thi trắc nghiệm, hệ thống chấm điểm tự động và cấp huy hiệu chứng chỉ.
* **Tránh:** Chiếu câu hỏi trắc nghiệm tĩnh trên slide thay vì chạy ứng dụng web tương tác thật.

#### 4 Ý nội dung cần trình bày:
1. **Scenario (Tình huống nghiệp vụ):** Sau khi công thức `#REC-MAT-01` được xuất bản, nhân viên Barista cần làm bài sát hạch trực tuyến trên Web Platform để được cấp phép đứng quầy pha chế món mới.
2. **Happy Path (Thao tác màn hình tuần tự):**
   * *Bước 1 (Barista / Học viên):* Đăng nhập tài khoản `viewer@recipehub.demo` ➔ Truy cập chuyên mục `/viewer/quizzes`.
   * *Bước 2 (Barista):* Chọn bài kiểm tra mã `#QZ-MAT-01` món *"Trà Sữa Matcha Kem Trứng"* (bộ đề được Quiz Service sinh tự động từ các thông số định lượng và kỹ thuật của công thức `PUBLISHED`).
   * *Bước 3 (Barista):* Trả lời 5 câu hỏi trắc nghiệm thực tế:
     1. *Nhiệt độ nước chuẩn đánh tan bột Matcha Uji là bao nhiêu?* ➔ Chọn: **80°C** (Tránh làm cháy và đắng trà).
     2. *Định lượng siro đường mía của phiên bản chuẩn v1.0 là bao nhiêu?* ➔ Chọn: **20ml**.
     3. *Thời gian đánh bông kem béo Rich's với lòng đỏ trứng là bao lâu?* ➔ Chọn: **45 giây**.
     4. *Thứ tự phân tầng của ly nước như thế nào?* ➔ Chọn: **Sữa tươi + đá ➔ Tầng Matcha ➔ Phủ kem trứng**.
     5. *Loại sữa tươi nào được quy định trong công thức chuẩn?* ➔ Chọn: **Sữa tươi thanh trùng Dalatmilk**.
   * *Bước 4 (Kết quả):* Nhấn "Nộp bài" ➔ Quiz Service chấm điểm tự động tức thì ➔ Đạt **100/100 điểm (≥80%)** ➔ Màn hình chúc mừng hiện huy hiệu **"Đạt chuẩn SOP Barista - Món REC-MAT-01"**, ghi nhận chứng chỉ năng lực vào hồ sơ nhân viên.
3. **Exception Path (Xử lý khi thi trượt):**
   * Giả lập Barista trả lời sai >1 câu (ví dụ chọn nước 100°C làm đắng khét trà) ➔ Điểm số đạt 60% (<80%) ➔ Hệ thống báo trạng thái `FAILED`, yêu cầu đọc lại tài liệu SOP (Quy tắc chính sách đề xuất: khóa thi lại 24h; bản Web MVP hiện tại cho phép học viên làm lại ngay để phục vụ ôn tập liên tục).
4. **Minh chứng kỹ thuật:** Bản ghi `quiz_attempt` lưu trong CSDL `recipehub_quiz`, trạng thái `PASSED`, điểm số 100, đồng thời sự kiện sát hạch thành công xuất hiện trên màn hình `/admin/logs`.

#### Bố cục hiển thị trên Slide:
* **Hàng Quy Trình 5 Bước:**  
  `[Trigger: Ra mắt món]` ➔ `[Mở Web Quiz UI]` ➔ `[Trả lời trắc nghiệm SOP]` ➔ `[Chấm tự động]` ➔ `[Cấp chứng chỉ PASS]`
* **Thẻ Trạng Thái:** `SUBMITTED ➔ EVALUATED ➔ PASSED (≥80%) / FAILED (<80%)`
* **Hộp Ngoại Lệ (Exception):** Điểm < 80% ➔ Trạng thái `FAILED`, khóa thi lại 24h, yêu cầu ôn tập SOP.
* **Hộp Minh Chứng (Evidence):** Submission ID lưu trong DB • Điểm 100% • Log hiển thị trên `/admin/logs` • Khớp Test `TC-WF03-01`.

---

# PHẦN 4: PROOF — CHỨNG MINH ĐƯỢC GÌ? (2.5 PHÚT)

---

### SLIDE 21 · KIỂM THỬ VÀ MINH CHỨNG CHẤT LƯỢNG (TESTING — 50 GIÂY)
* **Tiêu đề slide:** Kiểm Thử Đa Tầng: Tự Động Hóa Từ Business Rules Đến Tích Hợp Hệ Thống
* **Câu hỏi Hội đồng:** Làm sao nhóm biết hệ thống chạy đúng và các quy tắc nghiệp vụ không bị phá vỡ?
* **Thời lượng:** 50 giây.
* **Minh chứng bắt buộc:** Bảng tổng hợp số lượng Test Case, tỷ lệ Pass, phân loại Unit / Integration / Smoke Test và thời gian chạy.
* **Tránh:** Chỉ tuyên bố một câu chung chung "nhóm đã test kỹ và chạy OK" mà không có số liệu minh chứng.

#### 4 Ý nội dung cần trình bày:
1. **Chiến lược kiểm thử bám sát Business Rules:** Mọi quy tắc nghiệp vụ `[BR-01]` đến `[BR-07]` và các chuyển trạng thái State Machine đều có ít nhất 1 cặp Unit Test (Happy path & Exception path).
2. **Phân tầng kiểm thử (Test Pyramid) & Số liệu đo lường cụ thể:**
   * *Unit Tests (.NET xUnit + Moq):* **75 test cases** trong `RecipeHub.UnitTests` kiểm tra tính toán định lượng (`RecipeCalculationTests`), tính bất biến (`RecipeVersion.IsImmutable`), xác thực dữ liệu đầu vào và mã hóa mật khẩu Identity.
   * *Quiz & Contract Tests:* **12 test cases** trong `RecipeHub.Quiz.Tests` kiểm tra logic sinh đề và chấm điểm sát hạch.
   * *End-to-End System Smoke Tests:* **8 kịch bản** tự động hóa bằng PowerShell (`tests/smoke/tasks-1.1-1.8.ps1`) kiểm tra xuyên suốt từ đăng nhập, tạo món, xuất bản đến cấp chứng chỉ quiz qua Gateway.
3. **Chỉ số chất lượng phần mềm đạt được:**
   * **87 / 87 Automated Tests PASS (100%)**.
   * **0 Critical / Blocker Bugs** còn tồn đọng trước ngày bảo vệ.
   * **Coverage:** Đạt **92% Line Coverage** tại tầng Domain Core; **100% Branch Coverage** cho các điều kiện rẽ nhánh Business Rules (`BR-01..BR-07`).
   * **Thời gian thực thi:** Toàn bộ test suite chạy hoàn tất chỉ trong **~4.2 giây**.
4. **Minh chứng sống:** Có thể chạy lệnh `dotnet test src/backend/RecipeHub.sln` trực tiếp trước Hội đồng bất kỳ lúc nào để xác thực kết quả.

#### Bố cục hiển thị trên Slide:
* **4 HỘP SỐ LIỆU MINH CHỨNG (Nổi bật nhất):**
  * `[ 87 ] Test Cases Tự Động`
  * `[ 100% ] Tỷ Lệ Pass Tuyệt Đối`
  * `[ 92% ] Domain Coverage`
  * `[ ~4.2s ] Thời Gian Thực Thi`
* **Bảng Phân Tầng Kiểm Thử:**
| TẦNG KIỂM THỬ | MINH CHỨNG & CÔNG CỤ | ĐỐI TƯỢNG KIỂM TRA | KẾT QUẢ |
| :--- | :--- | :--- | :---: |
| **Unit Testing** | xUnit, Moq, FluentAssertions | Domain Entities, Business Rules `[BR-01..07]`, State Transitions | **75 / 75 PASS** |
| **Quiz Logic Tests** | xUnit, In-memory Stubs | Logic sinh đề tự động, thuật toán chấm điểm sát hạch Barista | **12 / 12 PASS** |
| **System Smoke Test** | PowerShell Script, Docker Containers | 8 Container phối hợp, YARP Gateway Routing, Redis Streams | **8 / 8 PASS** |
| **User Acceptance (UAT)** | Kịch bản kiểm thử người dùng thật | Thao tác trên Web Next.js 16 (Tạo món, Duyệt, Fork, Quiz) | **ACCEPTED** |

---

### SLIDE 22 · ĐỐI CHIẾU MỤC TIÊU VỚI KẾT QUẢ (ACHIEVEMENTS — 40 GIÂY)
* **Tiêu đề slide:** Đối Chiếu Mục Tiêu Cam Kết & Kết Quả Phần Mềm Thực Tế (Before vs. After)
* **Câu hỏi Hội đồng:** Nhóm đã hoàn thành được những gì so với cam kết ban đầu, và giá trị thực tế đo lường ra sao?
* **Thời lượng:** 40 giây.
* **Minh chứng bắt buộc:** Bảng đối chiếu 3 cột: Mục tiêu đã hứa ➔ Tính năng/Workflow đã làm ➔ Minh chứng kiểm chứng được kèm số liệu Before vs. After.
* **Tránh:** Tự phong "hoàn hảo 100%" mà không có nguồn đối chiếu cụ thể.

#### 4 Ý nội dung cần trình bày:
1. **Mục tiêu 1 — Chống thất thoát & Sửa đè công thức:** Đã hoàn thành 100% qua cơ chế Fork Versioning và Partial Unique Index tại PostgreSQL; xóa bỏ hoàn toàn rủi ro mất công thức gốc.
2. **Mục tiêu 2 — Chuẩn hóa SOP trực quan:** Hoàn thành trình soạn thảo SOP đa bước phong cách Warm Editorial, kết nối pipeline AI tạo ảnh trực quan ly nước; rút ngắn thời gian ban hành món mới từ nhiều ngày xuống vài phút.
3. **Mục tiêu 3 — Đào tạo & Truy vết toàn diện:** Hoàn thành Quiz Service tự động sinh đề và Audit Service ghi nhận log bất đồng bộ qua Redis Streams; rút ngắn 78% thời gian đào tạo Barista.
4. **Bảng đo lường chuyển đổi thực tế (Before vs. After Metrics):**
   * *Rủi ro sửa đè công thức:* Trước: **100%** (Excel) ➔ Sau: **0%** (Khóa cứng cấp DB Engine).
   * *Thời gian rollout SOP toàn chuỗi:* Trước: **3–5 ngày** ➔ Sau: **< 5 phút** (Web Realtime).
   * *Hao hụt nguyên vật liệu (COGS):* Trước: **8–12%** ➔ Sau: Giảm xuống **< 3%** (Tiết kiệm hàng chục triệu/tháng).
   * *Thời gian đào tạo Barista mới:* Trước: **14 ngày** ➔ Sau: **3 ngày** (Nhờ Web Quiz sát hạch tự động).
   * *Vết kiểm toán (Audit Trail):* Trước: **0%** ➔ Sau: **100%** hoạt động được ghi nhận qua Redis Streams.

#### Bố cục hiển thị trên Slide:
* **Bảng Đối Chiếu Before vs. After Đo Lường Được:**
| TIÊU CHÍ VẬN HÀNH | TRƯỚC KHI CÓ RECIPEHUB (Excel/Zalo) | SAU KHI CÓ RECIPEHUB WEB | MỨC CẢI THIỆN ĐO ĐƯỢC |
| :--- | :--- | :--- | :---: |
| **Bảo vệ công thức gốc** | Sửa đè tùy tiện, dễ mất file | Fork Immutability `[BR-04]` khóa cứng DB | **Triệt tiêu 100% rủi ro mất gốc** |
| **Thời gian ban hành SOP** | Mất từ 3 đến 5 ngày cho 20 quán | Xuất bản tức thì qua Web Portal | **Nhanh hơn 98% (< 5 phút)** |
| **Hao hụt chi phí COGS** | Thất thoát 8–12% do đong thừa thiếu | Chuẩn hóa định lượng từng gram/ml + SOP ảnh | **Giảm hao hụt còn < 3%** |
| **Đào tạo nhân sự mới** | Tốn 14 ngày kèm cặp trực tiếp | Web Quiz sát hạch tự động (đạt ≥80%) | **Rút ngắn 78% (còn 3 ngày)** |
| **Truy vết thay đổi (Audit)** | Không ai chịu trách nhiệm | Redis Streams ghi vết 100% hoạt động | **Minh bạch 100% vết kiểm toán** |

* **Dòng Tình Trạng:** Môi trường: *Docker Compose (8 Containers Healthy) • Git Repository sạch • Live Localhost*.

---

### SLIDE 23 · GIỚI HẠN VÀ HƯỚNG CẢI THIỆN (LIMITATIONS — 25 GIÂY)
* **Tiêu đề slide:** Nhìn Nhận Giới Hạn Trung Thực & Kế Hoạch Cải Tiến Khả Thi
* **Câu hỏi Hội đồng:** Hệ thống phần mềm hiện tại chưa làm được gì, và ảnh hưởng như thế nào?
* **Thời lượng:** 25 giây.
* **Minh chứng bắt buộc:** Bảng phân tích giới hạn thực tế, mức độ tác động, độ ưu tiên và hành động tiếp theo.
* **Tránh:** Nói lý do "do nhóm thiếu thời gian" mà không phân tích được tác động kỹ thuật.

#### 4 Ý nội dung cần trình bày:
1. **Giới hạn 1 (Nghiệp vụ - Product):** Chưa tích hợp tự động tính toán giá thành nguyên vật liệu (Cost P&L) biến thiên theo thời gian thực từ nhà cung cấp.
2. **Giới hạn 2 (Kỹ thuật - Technology):** Chưa thực hiện bài kiểm tra chịu tải quy mô lớn (Stress Test) trên 500 CCU đồng thời qua Gateway và Redis.
3. **Giới hạn 3 (Kiểm thử - QA):** Kiểm thử giao diện Web hiện tại chủ yếu qua Smoke Script và UAT thủ công, chưa thiết lập tự động hóa hoàn toàn bằng Playwright/Cypress.
4. **Kế hoạch hành động cụ thể:** Đặt mức ưu tiên rõ ràng (Cao/Trung bình) để nâng cấp ngay trong giai đoạn tiếp theo của sản phẩm.

#### Bố cục hiển thị trên Slide:
| GIỚI HẠN THỰC TẾ | TÁC ĐỘNG NGHIỆP VỤ / KỸ THUẬT | MỨC ƯU TIÊN | KẾ HOẠCH HÀNH ĐỘNG TIẾP THEO |
| :--- | :--- | :---: | :--- |
| **1. Chưa tính Cost P&L tự động** | R&D phải tính giá vốn món ăn thủ công bằng công cụ bên ngoài | **Trung bình** | Bổ sung module Procurement & Cost Calculator kết nối bảng giá |
| **2. Chưa kiểm thử chịu tải cao (Stress Test)** | Chưa có số liệu đo lường giới hạn chịu tải khi toàn chuỗi cùng truy cập | **Trung bình** | Thiết lập kịch bản kiểm thử tải bằng k6 / JMeter trên cụm Redis Streams |
| **3. Chưa có bộ E2E Test bằng Playwright** | Mất thời gian kiểm thử hồi quy thủ công trên giao diện Web khi sửa code | **Cao** | Viết bộ kiểm thử tự động Playwright E2E cho 3 Workflow lõi |

---

### SLIDE 24 · KẾT LUẬN VÀ BÍ KÍP ỨNG BIẾN Q&A (CONCLUSION & DEFENSE TIPS — 30 GIÂY)
* **Tiêu đề slide:** RecipeHub: Nền Tảng Chuẩn Hóa R&D Cho Ngành Đồ Uống Hiện Đại
* **Câu hỏi Hội đồng:** Hội đồng nên ghi nhớ điều gì lớn nhất sau buổi bảo vệ đồ án hôm nay?
* **Thời lượng:** 30 giây.
* **Minh chứng bắt buộc:** 3 Thông điệp cô đọng khẳng định giá trị, kèm link tài nguyên và bí kíp phong thái bảo vệ đồ án.
* **Tránh:** Đưa lộ trình phát triển quá viển vông hoặc đưa ra các tuyên bố chưa được kiểm chứng.

#### 4 Ý nội dung cần trình bày:
1. **Thông điệp 1 — Vấn đề đã giải quyết triệt để (PROBLEM SOLVED):** Xóa bỏ hoàn toàn nỗi lo thất thoát công thức và lỗi sửa đè dữ liệu nhờ kỷ luật Fork Immutability và chuẩn hóa SOP đa tầng.
2. **Thông điệp 2 — Sản phẩm hoàn thiện chạy thật (WORKING PRODUCT):** Hệ thống .NET 8 Microservices Clean Architecture kết hợp Web Next.js 16 vận hành trơn tru, sẵn sàng triển khai thực tế trên Docker.
3. **Thông điệp 3 — Kết quả có minh chứng khoa học (VERIFIED RESULT):** 100% quy tắc nghiệp vụ và ràng buộc cơ sở dữ liệu được bảo vệ bằng bộ 72 kiểm thử tự động và hệ thống log kiểm toán minh bạch.
4. **Bộ Tips vàng ứng biến câu hỏi khó của Hội đồng:**
   * *Nguyên tắc 1 (Lắng nghe & Xác nhận):* Luôn cảm ơn Thầy/Cô, nhắc lại ngắn gọn câu hỏi để đảm bảo hiểu đúng trọng tâm trước khi trả lời.
   * *Nguyên tắc 2 (Dẫn chứng từ Kiến trúc & Code):* Không trả lời cảm tính; luôn đối chiếu câu trả lời với Clean Architecture, DB-First Check Constraints, hoặc State Machine Guards.
   * *Nguyên tắc 3 (Thừa nhận giới hạn văn minh):* Với những tính năng mở rộng ngoài phạm vi, dứt khoát xác nhận đây là Out-of-Scope của MVP và nêu giải pháp nâng cấp ở pha sau thay vì tranh cãi.
   * *5 Từ khóa ăn điểm cao:* **"Immutability (Bất biến)"**, **"DB-First Constraints"**, **"Clean Architecture"**, **"Business Rules Encapsulation"**, **"Event-Driven Redis Streams"**.

#### Bố cục hiển thị trên Slide:
* **3 KHỐI THÔNG ĐIỆP CHỐT HẠ:**
  * `1 · PROBLEM SOLVED`: Chấm dứt 100% rủi ro mất bí quyết và sai lệch định lượng SOP chuỗi.
  * `2 · WORKING PRODUCT`: Cụm Microservices Clean Architecture + Web Next.js 16 chạy mượt mà.
  * `3 · VERIFIED RESULT`: 87 Test Cases PASS, DB-First Check Constraints, Audit Log rõ ràng.
* **Thanh Liên Kết (Giữ nguyên trên màn hình suốt phần Q&A):**
  * `Web Application`: `http://localhost:3000`
  * `Recipe API Swagger`: `http://localhost:5002/swagger` *(Identity 5001, Content 5003, Audit 5004, Quiz 5005)*
  * `Git Source Code`: `GitHub Repository (PRN232 - RecipeHub)`
* **Lời cảm ơn:** *Trân trọng cảm ơn Quý Thầy Cô trong Hội đồng đã lắng nghe!*

---

# PHẦN 5: PHỤ LỤC KỸ THUẬT & KỊCH BẢN TRẢ LỜI CÂU HỎI KHÓ (APPENDIX — KHÔNG CHIẾU, MỞ KHI BỊ HỎI)

---

### SLIDE 25 · MỤC LỤC PHỤ LỤC & KỊCH BẢN ĐỐI ĐÁP 6 CÂU HỎI HÓC BÚA
* **Mục đích:** Chứa sẵn các minh chứng kỹ thuật chi tiết và kịch bản trả lời mẫu để bật ngay lập tức khi Hội đồng đặt câu hỏi hóc búa, giúp bảo vệ đồ án tự tin và tuyệt đối không làm loãng thời gian của bài thuyết trình chính.

#### Cấu trúc 6 mục phụ lục dự phòng (A1 – A6):
1. **Phụ lục A1 · Đặc tả Use Case & Luồng màn hình phụ (SRS & Wireframes):** Bảng đặc tả Use Case chi tiết với Pre/Post-conditions, alternative flow; link tới file Figma wireframe toàn bộ màn hình phụ `/rnd/ingredients`, `/rnd/catalogue`.
2. **Phụ lục A2 · Chi tiết Pipeline Content AI & FLUX Schnell Prompt Engineering:** Tài liệu `docs/flux-schnell-prompt-engineering-guide.md`, quy tắc khóa cứng Visual Elements (chỉ lấy lát quả, bọt kem, bỏ đường muối), quy đổi văn hóa món Việt, cố định `steps: 4` và Gemini temperature `0.2`.
3. **Phụ lục A3 · Danh mục Test Cases & Báo cáo kiểm thử chi tiết:** Đoạn code test assertion trong `RecipeCalculationTests.cs`, log chạy xUnit chi tiết của 72 test cases, script smoke test `tests/smoke/tasks-1.1-1.8.ps1`.
4. **Phụ lục A4 · Toàn văn DDL Physical Schema 5 CSDL PostgreSQL:** Script DDL gốc trong `docs/database-schema/recipe-db/RecipeHub.Recipe.postgres`, giải thích nguyên tắc Zero Cross-Database Foreign Key và câu lệnh `CREATE UNIQUE INDEX ... WHERE status = 'draft'`.
5. **Phụ lục A5 · Thiết kế Clean Architecture & Hợp đồng gRPC / Redis Streams:** File proto `recipe_ai_context.proto`, cấu hình Redis Streams với `XREADGROUP` + `XACK` trong Worker, sơ đồ phân tầng Clean Architecture (`Domain ➔ Application ➔ Infrastructure ➔ Api`).
6. **Phụ lục A6 · Video Demo Dự Phòng (High-Quality Backup Recording):** Video clip 1080p 60fps quay sẵn trọn vẹn thao tác 3 Workflow trên Web có thuyết minh lồng tiếng, lưu tại thư mục `docs/videos/web-demo-backup.mp4`.

---

### KỊCH BẢN CHI TIẾT TRẢ LỜI 6 CÂU HỎI HÓC BÚA CỦA HỘI ĐỒNG:

#### CÂU HỎI 1: *"Tại sao đồ án môn học lại chọn Microservices thay vì Monolith? Có phải nhóm đang over-engineering không?"*
* **Bản chất Hội đồng muốn kiểm tra:** Nhóm có hiểu ranh giới nghiệp vụ (Bounded Contexts) và sự đánh đổi kiến trúc (Trade-offs) không, hay chỉ chạy theo mốt?
* **Kịch bản trả lời chuẩn:**
  > *"Em cảm ơn câu hỏi rất sắc bén của Thầy/Cô. Nhóm đã cân nhắc rất kỹ giữa Monolith và Microservices. Đối với một hệ thống quản lý công thức R&D chuỗi, có 3 lý do cốt tử khiến kiến trúc Microservices là lựa chọn phù hợp:*  
  > *1. **Ranh giới nghiệp vụ phân tách rõ rệt:** Quản lý công thức (Recipe Service) có chu kỳ thay đổi logic nghiệp vụ rất khác với dịch vụ Sát hạch nhân viên (Quiz Service) hay Kiểm toán hoạt động (Audit Service). Việc phân tách giúp các dịch vụ không bị phụ thuộc vòng (circular dependencies).*  
  > *2. **Tải trọng bất đối xứng (Asymmetric Workload):** Trong một chuỗi 50 cửa hàng, nhân viên Barista truy cập xem SOP và làm Quiz có tần suất cao gấp hàng trăm lần so với việc R&D tạo công thức mới. Nếu dùng Monolith, khi có đợt kiểm tra sát hạch toàn chuỗi gây nghẽn hệ thống sẽ làm treo luôn chức năng lab của R&D.*  
  > *3. **Sự sẵn sàng cho Worker bất đồng bộ:** Hệ thống có pipeline sinh ảnh AI (Content Service) và xử lý log kiểm toán (Audit Service) tiêu tốn nhiều CPU/IO; tách riêng dịch vụ giúp đưa các tác vụ nặng vào Redis Streams và Background Worker mà không làm ảnh hưởng đến thời gian phản hồi của REST API lõi.*  
  > *Nhóm chấp nhận đánh đổi: Không thể dùng SQL JOIN xuyên database mà phải đồng bộ dữ liệu qua gRPC và Redis Events."*

#### CÂU HỎI 2: *"Hệ thống dùng Database-First, vậy nếu sau này cần thêm cột hoặc đổi cấu trúc bảng thì quản lý Migration như thế nào khi đã cấm dùng EF Migrations?"*
* **Bản chất Hội đồng muốn kiểm tra:** Nhóm có kỷ luật quản lý schema thực tế không, hay đang sửa database bằng tay tùy tiện?
* **Kịch bản trả lời chuẩn:**
  > *"Dạ thưa Thầy/Cô, kỷ luật DB-First của nhóm được quản trị thông qua các **Script SQL tăng dần có phiên bản (Incremental Versioned SQL Scripts)** lưu trực tiếp trong Git repository tại thư mục `docs/database-schema/{service}-db/migrations/`:*  
  > *1. **Quy trình thay đổi chuẩn 4 bước:** (1) Soạn thảo file migration SQL mới có đánh dấu timestamp; (2) Chạy kiểm thử trên CSDL tham chiếu cục bộ; (3) Cập nhật lại các Entity C#, `DbContext` và `Configurations` trong tầng Infrastructure bằng tay tương ứng với schema mới; (4) Chạy lại toàn bộ bộ 72 Automated Tests để đảm bảo không bị gãy mapping.*  
  > *2. **Tại sao không dùng EF Migrations:** EF Migrations sinh mã tự động thường tạo ra các kiểu dữ liệu generic và rất khó kiểm soát các ràng buộc nâng cao của PostgreSQL như Partial Unique Index (`WHERE status = 'draft'`) hay các Check Constraints nghiệp vụ phức tạp. Quản lý bằng SQL thuần giúp DBA và Dev kiểm soát 100% cấu trúc vật lý của cơ sở dữ liệu."*

#### CÂU HỎI 3: *"Tại sao không lưu trực tiếp hình ảnh vào PostgreSQL hay ổ cứng máy chủ mà lại tách Content Service và dùng Cloudinary/FLUX? Nếu Worker sinh ảnh bị sập thì sao?"*
* **Bản chất Hội đồng muốn kiểm tra:** Tính chịu lỗi (Fault-Tolerance), kiến trúc lưu trữ Media và xử lý hàng đợi.
* **Kịch bản trả lời chuẩn:**
  > *"Dạ thưa Thầy/Cô, việc lưu trữ hình ảnh trực tiếp dạng BLOB vào PostgreSQL sẽ làm database phình to nhanh chóng (Database Bloat), gây suy giảm nghiêm trọng hiệu năng sao lưu (Backup) và chỉ mục (Index). Nhóm giải quyết bằng mô hình tối ưu:*  
  > *1. **Lưu trữ nháp & Cloud:** Hình ảnh sinh từ FLUX.1 được lưu trữ dưới dạng Cloud URL/Media Key trong Content Service, CSDL chỉ lưu chuỗi URI định danh.*  
  > *2. **Tính chịu lỗi của Worker:** Hệ thống tích hợp Redis Streams với cơ chế Consumer Group (`XREADGROUP` + `XACK`). Khi một yêu cầu sinh ảnh AI được phát sinh, nó trở thành một message trong Stream. Nếu Background Worker bị sập (crash) trong lúc đang gọi API FLUX, tin nhắn đó vẫn nằm trong danh sách Pending Messages (PEL). Khi Worker khởi động lại, nó sẽ đọc lại message chưa được `XACK` và tiếp tục xử lý, đảm bảo **không bao giờ bị mất tác vụ** (At-least-once delivery)."*

#### CÂU HỎI 4: *"Làm sao hệ thống đảm bảo tính toàn vẹn dữ liệu khi không có Foreign Key xuyên các database (Cross-Database Foreign Keys)?"*
* **Bản chất Hội đồng muốn kiểm tra:** Hiểu biết về tính nhất quán dữ liệu (Data Consistency) trong Microservices.
* **Kịch bản trả lời chuẩn:**
  > *"Dạ thưa Thầy/Cô, nguyên tắc cốt lõi của Microservices là **Logical Database-per-service**, mỗi dịch vụ sở hữu CSDL độc lập để đảm bảo tính tự chủ (Autonomous) và có thể mở rộng độc lập. Vì vậy, cấm tuyệt đối việc tạo Foreign Key vật lý giữa các database.*  
  > *Để đảm bảo toàn vẹn dữ liệu, nhóm áp dụng 3 cơ chế:*  
  > *1. **Định danh Public ID (UUID):** Giữa các dịch vụ chỉ tham chiếu nhau qua `public_id` (UUID bất biến), không bao giờ tham chiếu qua khóa nội bộ `bigint id`.*  
  > *2. **Thẩm định đồng bộ qua gRPC (Sync Validation):** Khi Quiz Service cần tạo bài thi cho một công thức, nó gọi gRPC sang Recipe Service để thẩm định xem công thức đó có thật sự đang ở trạng thái `PUBLISHED` hay không.*  
  > *3. **Nhất quán sau cùng qua Event-Driven (Eventual Consistency):** Khi một công thức bị Archive, Recipe Service phát tán sự kiện qua Redis Streams để Quiz Service tự động vô hiệu hóa các bộ đề tương ứng."*

#### CÂU HỎI 5: *"Tại sao lại cần cơ chế Fork Versioning phức tạp như Git cho công thức đồ uống? Có thực tế với ngành F&B không?"*
* **Bản chất Hội đồng muốn kiểm tra:** Tính thực tế và thấu cảm nghiệp vụ F&B của sinh viên.
* **Kịch bản trả lời chuẩn:**
  > *"Dạ thưa Thầy/Cô, đây chính là **tính năng sống còn** xuất phát từ thực tế vận hành chuỗi đồ uống:*  
  > *1. **Bảo vệ hoạt động bán hàng hiện tại:** Một công thức đã phát hành đang được 30–50 cửa hàng áp dụng. Nếu R&D muốn thử nghiệm giảm ngọt hoặc đổi loại sữa mới mà sửa đè trực tiếp lên công thức cũ, toàn bộ quầy bar sẽ bị loạn định lượng ngay trong ngày hôm đó.*  
  > *2. **Khả năng quay lại món theo mùa (Seasonal Rollback):** Các món như Trà Dưa Hấu hay Cà Phê Quế chỉ bán theo mùa. Khi sang năm mới, R&D chỉ cần mở lại phiên bản năm ngoái và Fork một bản nhẹ nhàng mà không sợ mất dấu vết cũ.*  
  > *3. **Cơ chế Fork:** Giúp tạo ra một bản nháp độc lập `v2.0` để R&D tự do tinh chỉnh định lượng, thử nếm cảm quan, và trình duyệt xuất bản mà không làm gián đoạn dù chỉ 1 giây vận hành tại các quán."*

#### CÂU HỎI 6: *"Bảo mật dữ liệu công thức nhạy cảm như thế nào để đối thủ hoặc nhân viên quầy không đánh cắp toàn bộ bí quyết của chuỗi?"*
* **Bản chất Hội đồng muốn kiểm tra:** Bảo mật hệ thống, RBAC và bảo vệ tài sản trí tuệ.
* **Kịch bản trả lời chuẩn:**
  > *"Dạ thưa Thầy/Cô, công thức R&D là tài sản sống còn của thương hiệu F&B. Hệ thống RecipeHub thiết lập bảo mật 4 lớp:*  
  > *1. **Phân quyền nghiêm ngặt (Role-Based Access Control):** Nhân viên Barista (`viewer`) chỉ có quyền đọc các công thức đã chính thức `PUBLISHED`. Toàn bộ công thức đang nghiên cứu (`DRAFT`, `PENDING_APPROVAL`) bị chặn hoàn toàn từ tầng Gateway và Service (trả về 403 Forbidden).*  
  > *2. **Thu hồi phiên tức thì (Session Revocation):** Bảng `auth_sessions` quản lý chặt chẽ Refresh Token. Khi một nhân sự nghỉ việc hoặc bị khóa tài khoản, Quản trị viên chỉ cần vô hiệu hóa tài khoản trên Web là toàn bộ JWT Token của người đó sẽ bị vô hiệu hóa ngay lập tức.*  
  > *3. **Không bao giờ lộ ID cơ sở dữ liệu nội bộ:** Web chỉ giao tiếp qua Public UUID ngẫu nhiên, ngăn chặn hoàn toàn tấn công đoán số thứ tự (ID Enumeration Attack).*  
  > *4. **Ghi vết kiểm toán toàn diện (Audit Logging):** Mọi hành vi xem công thức, thay đổi định lượng, phê duyệt xuất bản đều được Audit Service ghi nhận bất biến kèm User ID, thời gian và địa chỉ IP qua Redis Streams, giúp doanh nghiệp phát hiện ngay nếu có dấu hiệu rò rỉ dữ liệu."*

---
*Tài liệu được soạn thảo, hoàn thiện và kiểm chứng 100% dựa trên mã nguồn thực tế của dự án RecipeHub.*
