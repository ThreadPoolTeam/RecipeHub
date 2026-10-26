# Hướng dẫn Kỹ thuật Prompt Engineering: Gemini & FLUX.1 Schnell

> **Dành cho kỹ sư phát triển RecipeHub Content Service.**  
> Tài liệu tổng hợp toàn bộ nguyên lý, điểm chết (pitfalls), quy tắc Nên / Không nên và mẫu System Prompt chuẩn hóa cho pipeline sinh ảnh đồ uống R&D sử dụng **Google Gemini** (Prompt Compiler) và **FLUX.1 Schnell** (Diffusion Generator qua Cloudflare Workers AI).

---

## 1. Kiến trúc Pipeline & Ràng buộc Kỹ thuật

Pipeline tạo ảnh trong RecipeHub hoạt động qua 2 chặng bất đồng bộ:
```text
[Recipe DB / gRPC] 
       ↓ (InputSnapshot JSON)
[Gemini 2.5 Flash]  ── (Prompt Translator / Compiler)
       ↓ (English Prompt: 300 - 600 ký tự)
[Cloudflare Workers AI] ── (@cf/black-forest-labs/flux-1-schnell, steps = 4)
       ↓ (Raw Binary PNG / JPEG)
[Shared Temp Storage] ── (TTL 30 phút chờ Review/Accept)
```

### Các ràng buộc phần cứng & mô hình cốt tử:
1. **FLUX.1 Schnell là Distilled Diffusion Model (Cố định `steps = 4`):**
   - Chỉ có 4 bước khuếch tán để hội tụ ảnh từ nhiễu hạt (noise).
   - Không có thời gian hoặc dung lượng bước để giải quyết các câu lệnh mâu thuẫn, prompt dài dòng hoặc nhiều chủ thể tranh chấp.
2. **Cloudflare Workers AI KHÔNG CÓ tham số `negative_prompt`:**
   - API chỉ nhận duy nhất payload `{ "prompt": string, "steps": 4 }`.
   - Bất kỳ câu lệnh cấm nào ghi trong text prompt đều có nguy cơ phản tác dụng.
3. **Cơ chế suy giảm chú ý của T5 Text Encoder (Front-loading):**
   - Trọng số chú ý (Cross-attention weight) tập trung mạnh nhất vào **77 tokens đầu tiên**.
   - Bất cứ chi tiết nào đặt ở đầu câu sẽ chiếm lĩnh bố cục chính của bức ảnh.
4. **Dung lượng ký tự tối ưu:**
   - *Hard limit:* 2048 ký tự (vượt quá sẽ bị C# ném `InvalidOperationException`).
   - *Vùng hiệu quả cao nhất (Sweet Spot):* **300 – 600 ký tự (khoảng 50 – 90 từ tiếng Anh)**. Prompt trên 1000 ký tự làm loãng token, gây méo mó ly tách hoặc sinh thêm dị vật (tay thừa, đồ vật lạ).

---

## 2. Sáu Điểm Chết Thực Tế (Critical Pitfalls & Failure Modes)

### Điểm chết 1: Hiệu ứng "Con voi hồng" (Negative Prompt Leakage)
* **Bản chất lỗi:** Viết câu phủ định vào text prompt như *"Do not add mint leaves"*, *"No strawberries"*, *"Without hands"*.
* **Tại sao gãy:** T5 encoder tách câu thành các vector token riêng lẻ: `mint`, `leaves`, `strawberries`, `hands`. Mô hình khuếch tán nhận thấy sự xuất hiện của các token này trong không gian vector và dồn pixel vẽ ra lá bạc hà, quả dâu tây hoặc bàn tay kỳ dị.
* **Quy tắc:** Tuyệt đối **KHÔNG** dùng từ phủ định (`no`, `not`, `without`, `never`, `exclude`). Sử dụng **Positive Framing (Mô tả khẳng định khép kín)**.
  * *Sai:* `A glass of peach tea, no mint, no lime.`
  * *Đúng:* `A glass of peach tea, styled solely with two sliced yellow peaches.`

---

### Điểm chết 2: Hố sâu văn hóa & dữ liệu huấn luyện (Domain Gap đồ uống Việt)
* **Bản chất lỗi:** Dịch nguyên văn tên hoặc nguyên liệu món Việt sang tiếng Anh học thuật.
  * *Rau má đậu xanh* ➔ *"Pennywort juice with mung bean paste"* ➔ FLUX vẽ ra bát súp thuốc bắc hoặc ly bùn màu xám xanh.
  * *Cà phê muối* ➔ *"Salt coffee"* ➔ FLUX vẽ một đĩa muối trắng hoặc cốc cà phê rắc hạt muối to tướng lên trên.
  * *Trà mãng cầu* ➔ *"Soursop tea"* ➔ FLUX không có dữ liệu quả mãng cầu gai dầm, sinh ra khối quả nham nhở.
  * *Chè dưỡng nhan / Trà tuyết yến* ➔ Dịch nghĩa đen sinh ra keo dán hoặc chất nhầy kỳ dị.
* **Quy tắc (Visual Abstraction Mapping):** Gemini phải đóng vai trò thông dịch viên thị giác, chuyển các khái niệm bản địa thành **thuộc tính vật lý phổ quát của nhiếp ảnh phương Tây**:
  * *Rau má đậu xanh:* *"A two-layer iced drink, bright pastel green liquid on bottom, smooth yellow cream layer on top."*
  * *Cà phê muối:* *"An iced Vietnamese dark drip coffee topped with a thick layer of dense salted whipping cream foam."*
  * *Trà mãng cầu:* *"A refreshing iced amber fruit tea mixed with crushed fibrous white tropical fruit pulp and crystal ice."*

---

### Điểm chết 3: Rác nguyên liệu hòa tan (Dissolved Ingredients Clutter)
* **Bản chất lỗi:** Database trả về công thức đầy đủ 8–10 nguyên liệu: `30ml siro đào, 10ml đường nước, 2g muối hồng, 5g bột frappe, 120ml nước lọc, 3g trà đen`. Nếu Gemini liệt kê toàn bộ vào prompt:
* **Hậu quả:** FLUX sẽ cố vẽ chai siro công nghiệp, chén đường, đĩa muối, muỗng đong vương vãi khắp mặt bàn, làm lu mờ ly đồ uống chính.
* **Quy tắc:** 
  * Phân loại nguyên liệu: **Nguyên liệu vô hình (Invisible/Dissolved)** vs **Nguyên liệu thị giác (Visible Elements)**.
  * Lọc triệt để: Đường, muối, siro, sữa đặc khuấy tan, bột béo, chất ổn định phải được chuyển hóa thành **màu sắc, độ đục và kết cấu của chất lỏng** (chứ không tả dưới dạng nguyên liệu rời).
  * Chỉ giữ lại: Quả tươi, lát cắt trang trí (garnish), lớp bọt (foam/crema), hạt (chia/trân châu/thạch), phân tầng màu (ombre layers).

---

### Điểm chết 4: Lạm dụng văn phong hoa mỹ / Temperature cao (Poetic Hallucination)
* **Bản chất lỗi:** Để `temperature: 0.7` trong Gemini. Gemini có xu hướng dùng văn phong cảm xúc của copywriter: *"A symphony of refreshing sweetness, whispering morning breeze, evoking nostalgic rustic memories, a taste of heaven."*
* **Hậu quả:** Tốn 30–50% dung lượng token quý giá cho những từ ngữ trừu tượng mà mô hình khuếch tán không thể biểu diễn bằng hình ảnh.
* **Quy tắc:**
  * Hạ `temperature` xuống **`0.1` đến `0.2`** trong `GeminiPromptTranslator.cs`.
  * Ép Gemini dùng phong cách **Technical Commercial Photography (Đặc tả kỹ thuật nhiếp ảnh studio)**: danh từ cụ thể, tính từ thị giác (màu sắc, độ trong, độ bóng, góc máy, ánh sáng).

---

### Điểm chết 5: Lẫn lộn giữa Ảnh Thành Phẩm (`final_product`) và Ảnh Thao Tác Bước (`step_instruction`)
* **Bản chất lỗi:** Dùng chung một cấu trúc prompt cho cả 2 mục đích.
* **Hậu quả:** 
  * Bước 1: *"Ủ trà đen 15 phút với nước sôi 95°C"*, nhưng ảnh sinh ra lại là một ly trà sữa trân châu hoàn chỉnh cắm ống hút. Người học pha chế không thấy được dụng cụ ủ hay màu nước cốt trà.
* **Quy tắc:** Tách rẽ nhánh dứt khoát theo `TargetKind`:
  * `final_product`: Chủ thể là ly thành phẩm hoàn chỉnh, góc chụp ngang mắt / 45° (Hero shot), đặt trên bàn phục vụ decor sang trọng.
  * `step_instruction`: Chủ thể là **thao tác & dụng cụ chuyên dụng** (ấm rót cổ ngỗng, bình lắc shaker, ly đong jigger, muỗng bar spoon), góc chụp từ trên xuống (Top-down / 45° Barista POV), mặt bàn pha chế inox/đá sạch sẽ. Tuyệt đối không vẽ ly thành phẩm nếu chưa đến bước cuối.

---

### Điểm chết 6: Mâu thuẫn vật lý nhiệt độ (Hot vs. Iced Physics)
* **Bản chất lỗi:** Công thức không ghi rõ nhiệt độ hoặc chỉ ghi chung chung, Gemini suy diễn thiếu kiểm soát.
* **Hậu quả:** Ảnh sinh ra vừa có khói bốc lên nghi ngút (đồ nóng), vừa có đá viên nổi lềnh bềnh và giọt nước ngưng tụ trên thành ly (đồ đá), hoặc cà phê nóng đựng trong ly nhựa trong suốt mỏng manh.
* **Quy tắc:**
  * Nếu có đá (`ice/iced/đá viên`): Ép chi tiết vật lý: *"crystal-clear ice cubes, condensation water droplets on the outer glass surface"*. Không có khói.
  * Nếu là đồ nóng (`hot/warm/steamed`): Ép chi tiết: *"gentle wisps of rising steam, ceramic cup or insulated mug"*. Không có đá viên.

---

## 3. Bảng Quy Tắc Nên (DOs) & Không Nên (DON'Ts)

| Hạng mục | NÊN (DOs) | KHÔNG NÊN (DON'Ts) |
| :--- | :--- | :--- |
| **Bố cục Token** | Đặt chủ thể ly nước & chất lỏng ở **50 token đầu tiên**. | Mở đầu bằng bối cảnh dài dòng (*"In a cozy sunny cafe on a rustic wooden table..."*). |
| **Xử lý từ cấm** | Dùng từ chỉ định khép kín: *"garnished exclusively with...", "plain minimal surface"*. | Dùng từ phủ định: *"no mint, without hands, do not add plastic straws"*. |
| **Ký tự & Độ dài** | Giữ độ dài từ **300 – 600 ký tự** (50 – 90 từ). | Viết dài lê thê > 1200 ký tự làm loãng trọng số FLUX Schnell. |
| **Đồ uống Việt** | Quy đổi thị giác (màu nước, độ sánh, tầng bọt, loại thạch). | Giữ nguyên tên tiếng Việt phiên âm hoặc dịch thô khiến FLUX hallucinate. |
| **Nguyên liệu** | Chỉ trích xuất nguyên liệu nhìn thấy được (visual garnishes). | Đưa định lượng chi tiết (ml, gram) và nguyên liệu hòa tan (đường, muối) vào prompt. |
| **Bối cảnh** | Tối giản, ánh sáng studio mềm mại, hậu cảnh mờ (shallow depth of field). | Mô tả bối cảnh phức tạp (nhiều người đi lại, quán cafe đông đúc, tranh ảnh treo tường). |
| **Chữ & Logo** | Chỉ định bề mặt trơn nhẵn, ly thủy tinh trong suốt không logo. | Yêu cầu nhãn mác, menu, chữ viết, logo thương hiệu (FLUX sinh chữ rác/méo). |

---

## 4. Công Thức Giải Phẫu Prompt Chuẩn (Prompt Anatomy)

Mọi prompt chuyển đổi từ Gemini sang FLUX Schnell nên tuân thủ cấu trúc 5 tầng liên hoàn:

$$\text{Prompt} = \underbrace{\text{[Chủ thể \& Trạng thái]}}_{\text{Ưu tiên 1}} + \underbrace{\text{[Vật chứa/Ly cốc]}}_{\text{Ưu tiên 2}} + \underbrace{\text{[Chất lỏng \& Vật lý]}} + \underbrace{\text{[Topping \& Bề mặt]}} + \underbrace{\text{[Bối cảnh \& Ánh sáng]}}_{\text{Ưu tiên cuối}}$$

### Chi tiết từng tầng:
1. **Chủ thể & Trạng thái (Subject & State):** Tên định dạng đồ uống (Iced latte, hot espresso, sparkling soda, layered fruit tea).
2. **Vật chứa (Vessel):** Ly highball, tách gốm sứ có đĩa lót, ly thủy tinh có chân coupe, ly vát cạnh.
3. **Chất lỏng & Hiệu ứng vật lý (Liquid & Physics):** Màu sắc cụ thể (amber, ruby-red, creamy beige, emerald green), độ trong suốt, bọt khí sủi tăm, đá viên, ngưng tụ hơi nước, khói bốc nhẹ.
4. **Bề mặt & Trang trí (Surface & Garnish):** Lớp bọt crema nâu vàng, nghệ thuật latte art, 2 lát cam vàng, 1 nhánh sả đập dập.
5. **Bối cảnh & Ánh sáng (Setting & Studio Lighting):** Bàn đá marble trung tính hoặc mặt gỗ sáng màu, ánh sáng studio tự nhiên khuếch tán, xóa phông nhẹ (bokeh mờ).

---

## 5. Mẫu System Prompt Chuẩn Hóa Triển Khai (Production Ready)

Đây là System Instruction chuẩn hóa nạp vào `GeminiPromptTranslator.cs`:

```text
You are an expert commercial beverage photographer and technical prompt compiler for FLUX Schnell.
Your role: Convert the input Recipe JSON into a single, highly accurate English visual prompt.

CORE RULES:
1. TOKEN HIERARCHY (Front-load the subject):
   Start immediately with the beverage name, temperature state, and glassware. Put background and lighting at the very end.
   Structure: [Subject & Temperature] + [Appropriate Glassware] + [Liquid Appearance & Physics] + [Visible Garnishes] + [Studio Environment].

2. INGREDIENT FILTERING & VISUAL CONVERSION:
   - Identify VISIBLE ingredients only: fruit slices, floating seeds, herbs, foam layers, crema, ice cubes, or gradients.
   - Ignore completely DISSOLVED ingredients (sugar, syrup, salt, milk powder, chemical stabilizers). Convert them into liquid opacity, viscosity, and color.
   - For Vietnamese traditional drinks, convert cultural terms into universal visual physical descriptions (e.g., salt coffee -> dark drip coffee topped with dense salted cream foam; pennywort -> vibrant pastel green layered drink).

3. TARGET-SPECIFIC MODES:
   - If targetKind == "final_product": 
     Focus on an appetizing hero shot of the finished drink at eye-level or 45-degree angle.
   - If targetKind == "step_instruction": 
     Focus strictly on the immediate action (pouring, brewing, shaking, measuring) with appropriate tools (jigger, shaker, kettle) from a 45-degree barista POV or top-down view. Include ONLY ingredients used in this step. Do not show the final assembled beverage unless it is the final step.

4. STRICT CONSTRAINTS FOR FLUX SCHNELL:
   - Length: Strictly between 350 and 600 characters (around 60 to 90 words).
   - Write ONE continuous, cohesive descriptive paragraph in English.
   - NO negative words (strictly forbid: 'no', 'not', 'without', 'never', 'except', 'free of'). Describe what IS present using exclusive phrasing (e.g., "garnished solely with two orange slices").
   - NO human faces, no visible brand logos, no text or typography, no borders, no hands unless showing an instructional step.
   - Temperature: 0.2 (deterministic, visual-technical terms only, no poetic filler).

Output ONLY the final English prompt string, without explanations, markdown backticks, or quotation marks.
```

---

## 6. Checklist Tích Hợp Kỹ Thuật (Developer Checklist)

Khi triển khai code tại `RecipeHub.Content.Infrastructure`:

- [ ] **Gemini Client Configuration (`GeminiPromptTranslator.cs`):**
  - Đã đặt `temperature: 0.2` (thay vì `0.7` hiện tại).
  - Đã giới hạn `maxOutputTokens: 300` (đủ cho 100 từ, tránh Gemini nói dông dài).
  - Xoay vòng mảng `GEMINI_API_KEYS` khi gặp HTTP 429.
- [ ] **Prompt Sanitization (`CleanPrompt`):**
  - Cắt bỏ triệt để các ký tự bao bọc: `"`, `'`, `` ` ``, `\n`, `\r`.
  - Cảnh báo hoặc reject nếu prompt vượt quá 1000 ký tự (ngưỡng tối ưu) hoặc 2048 ký tự (ngưỡng hard-limit Cloudflare).
- [ ] **Cloudflare FLUX Client (`CloudflareFluxGenerator.cs`):**
  - Giữ cố định `steps: 4` cho profile `@cf/black-forest-labs/flux-1-schnell`.
  - Kiểm tra Content-Type: Phân biệt phản hồi nhị phân trực tiếp (`image/png`) vs phản hồi Base64 (`application/json`).
  - Duy trì dummy image fallback trong môi trường Local Dev khi chưa nạp API Token Cloudflare.
- [ ] **Database & Outbox Logging:**
  - Luôn lưu trường `PromptSnapshot` vào bảng `ai_image_drafts` sau khi Gemini sinh xong để phục vụ kiểm toán (audit) và đo lường chất lượng visual prompt.
