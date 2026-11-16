##### SOFTWARE PROJECT • CHUYÊN ĐỀ

##### WORKFLOW LÀ GÌ?

Định nghĩa, nhận diện và đặc tả luồng nghiệp vụ trong đồ án phần mềm

**TRIGGER BƯỚC & QUYẾT ĐỊNH THAY ĐỔI TRẠNG THÁI KẾT QUẢ**

### Ai làm gì, theo thứ tự nào, để đạt kết quả gì - không phải "bấm những nút nào".

Đi kèm bộ khung Software Project Presentation Guideline V3 (slide 06, 08, 09, 12, 21, 22)

##### ĐỊNH NGHĨA VÌ SAO CẦN ĐỊNH NGHĨA ĐÚNG

## Workflow là sợi chỉ nối toàn bộ đồ án

Định nghĩa sai ở bước đầu thì thiết kế, demo và kiểm thử phía sau đều lệch theo.

| 06 | 08 | 09 | 12 | 13 | 19 | 21 | 22 |
|---|---|---|---|---|---|---|---|
| Nhóm FR | Activity / | State | Sequence | UI theo | Ma trận | Demo | Test theo |
| thành WF | BPMN | machine | diagram | WF | truy vết | từng WF | WF / BR |

| Số trên mỗi ô là số slide | trong | bộ khung Guideline V3. |  |  |  |  |  |  |
|---|---|---|---|---|---|---|---|---|
| Khi workflow |  | được chọn đúng |  |  | Khi workflow | bị chọn sai |  |  |

| • | Activity diagram có rẽ nhánh theo business rule | • | Activity diagram thành danh sách thao tác click |
|---|---|---|---|
| • | State machine có sự kiện thật làm đối tượng đổi trạng thái | • | State machine trống hoặc vẽ cho từng màn hình |
| • | Demo kể được một câu chuyện end-to-end | • | Demo đi theo menu chức năng |
| • | Mỗi nhánh rẽ sinh ra một test case | • | Test chỉ kiểm "mở được màn hình" |

W O R K F LO W / Đ Ị N H N G H Ĩ A & ĐẶ C TẢ L U Ồ N G N G H I Ệ P V Ụ **W02**

##### ĐỊNH NGHĨA ĐỊNH NGHĨA

## Workflow là chuỗi bước từ trigger đến kết quả nghiệp vụ

**Workflow (luồng nghiệp vụ) là một chuỗi bước có thứ tự, do một hoặc nhiều actor cùng hệ thống thực hiện, bắt đầu bằng một trigger và kết thúc bằng một kết quả nghiệp vụ có giá trị, quan sát được; trên đường đi, dữ liệu**

hoặc trạng thái của đối tượng nghiệp vụ thay đổi theo business rule.

##### ◇ quyết định theo BR

**TRIGGER Bước 1 Bước 2 Bước 3 KẾT QUẢ + nhánh ngoại lệ**

sự kiện khởi động Actor A Hệ thống Actor B actor nhận được giá trị

##### ĐỐI TƯỢNG NGHIỆP VỤ DRAFT → SUBMITTED → APPROVED

#### Nói ngắn gọn: ai làm gì, theo thứ tự nào, để đạt kết quả gì - không phải "người dùng bấm những nút nào".

W O R K F LO W / Đ Ị N H N G H Ĩ A & ĐẶ C TẢ L U Ồ N G N G H I Ệ P V Ụ **W03**

| ĐỊNH NGHĨA 1 | ĐỊNH NGHĨA Mã & tên | THÀNH PHẦN Mã & tên | 2 | Actor | 3 | Trigger | 4 | Precondition |
|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |

| Gọi là gì? | Ai tham gia? | Điều gì khởi động luồng? | Điều gì phải đúng trước? |
|---|---|---|---|
| WF-02 · Duyệt yêu cầu mua hàng | Nhân viên, Quản lý, Hệ thống email | Nhân viên gửi yêu cầu | Yêu cầu ở DRAFT, có ≥ 1 dòng hàng |

**5 Bước & quyết định 6 Kết quả 7 Exception**

| Làm gì, rẽ nhánh theo rule nào? | Trạng thái nào đổi, actor nhận gì? | Khi sai thì sao? |
|---|---|---|
| Kiểm tra hạn mức (BR-03) → duyệt / từ chối | Sang APPROVED, nhân viên nhận thông báo | Vượt hạn mức → chuyển cấp trên |

W O R K F LO W / Đ Ị N H N G H Ĩ A & ĐẶ C TẢ L U Ồ N G N G H I Ệ P V Ụ **W04**

##### NHẬN DIỆN KIỂM TRA NHANH

## Năm câu hỏi để biết đó có phải workflow

Chỉ gọi là workflow khi trả lời "có" cho cả năm câu.

---

##### Có trigger rõ ràng không?

**1**

Một sự kiện cụ thể: người dùng gửi, đến hạn, hệ thống ngoài gọi vào.

**5 / 5**

---

##### Có kết thúc bằng kết quả nghiệp vụ có giá trị không?

**2**

"Mở được màn hình X" không phải là kết quả. "có" → là workflow

---

##### Có thay đổi dữ liệu / trạng thái, hoặc một quyết định?

**3**

Ít nhất một đối tượng nghiệp vụ khác đi sau luồng.

---

##### THIẾU CÂU NÀO?

---

**Có điểm rẽ nhánh theo business rule, hoặc nhánh ngoại lệ?** Thiếu câu 2 → thường là một màn hình.

**4**

Không có nhánh nào thì thường chỉ là một thao tác. Thiếu câu 3, 4 → thường là CRUD đơn lẻ.

Thiếu câu 5 → đang mô tả giao diện, không phải

---

nghiệp vụ.

---

##### Diễn đạt được bằng ngôn ngữ nghiệp vụ, không cần tên nút?

**5**

Người ngoài ngành nghe vẫn hiểu.

---

W O R K F LO W / Đ Ị N H N G H Ĩ A & ĐẶ C TẢ L U Ồ N G N G H I Ệ P V Ụ **W05**

| NHẬN DIỆN | HAY NHẦM |  |  |  |
|---|---|---|---|---|
| Những Chúng vẫn có chỗ | thứ thường trong đồ án, nhưng không | bị gọi nhầm phải ở vị trí của workflow. | là workflow |  |

---

| Bị gọi là workflow | Thực chất là | Vì sao chưa phải | Nên đặt ở đâu |
|---|---|---|---|
| "Màn hình quản lý đơn hàng" | Một màn hình (UI) | Không có trigger, không có kết quả | Slide UI/UX |
| "Thêm / sửa / xóa sản phẩm" | Thao tác CRUD | Một bước, không có quyết định nghiệp vụ | Danh sách FR |
| "Vào menu → bấm Tạo → Lưu" | Chuỗi click (user flow) | Mô tả giao diện, không phải nghiệp vụ | User flow trong UI/UX |
| "Đăng nhập" | Chức năng hỗ trợ | Không tạo giá trị nghiệp vụ | Precondition của WF khác |
| "Module báo cáo" | Nhóm chức năng | Quá rộng; bên trong có nhiều WF | Nhóm feature |
|  |  |  |  |

---

#### Mẹo: nếu tên chứa "màn hình", "module", "quản lý", "nút" thì nhiều khả năng đó chưa phải workflow.

W O R K F LO W / Đ Ị N H N G H Ĩ A & ĐẶ C TẢ L U Ồ N G N G H I Ệ P V Ụ

**W06**

| NHẬN DIỆN Workflow khác gì Feature, Use case, User flow, State machine? Mỗi khái niệm nhìn hệ thống từ một góc; workflow là trục nối chúng lại. | PHÂN BIỆT Workflow khác gì Feature, Use case, User flow, State machine? Mỗi khái niệm nhìn hệ thống từ một góc; workflow là trục nối chúng lại. | PHÂN BIỆT Workflow khác gì Feature, Use case, User flow, State machine? Mỗi khái niệm nhìn hệ thống từ một góc; workflow là trục nối chúng lại. | Workflow khác gì Feature, Use case, User flow, State machine? | Workflow khác gì Feature, Use case, User flow, State machine? |
|---|---|---|---|---|
| Khái niệm |  | Mô tả cái gì | Quan hệ với workflow | Sơ đồ thường dùng |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |

---

|  |  |  |  |
|---|---|---|---|
|  |  |  |  |
| Feature / FR | Năng lực hệ thống làm được | Một WF dùng nhiều FR | Danh sách FR |
| Use case | Mục tiêu của một actor trong một lần tương tác | Một WF có thể gồm nhiều use case | Use case diagram |
| Workflow | Chuỗi bước xuyên actor, từ trigger đến kết quả | - | Activity / BPMN |
| User flow | Đường đi qua các màn hình | Hiện thực hóa phần giao diện của WF | Flow màn hình |
| State machine | Vòng đời của một đối tượng | WF làm đối tượng chuyển trạng thái | State diagram |
| Sequence | Các layer bên trong phối hợp | Mô tả "bên trong" một bước của WF | Sequence diagram |

---

W O R K F LO W / Đ Ị N H N G H Ĩ A & ĐẶ C TẢ L U Ồ N G N G H I Ệ P V Ụ **W07**

##### ĐẶC TẢ ĐỘ CHI TIẾT

## Chọn workflow vừa cỡ: không quá nhỏ, không quá lớn

Workflow lõi phải trả lời được một pain point ở phần Context & Problem.

### QUÁ NHỎ VỪA QUÁ LỚN

| DẤU HIỆU | DẤU HIỆU | DẤU HIỆU |
|---|---|---|
| 1 bước, không có quyết định | 3-7 bước, có rẽ nhánh, gắn một pain point | > 10 bước, nhiều mục tiêu, cả một module |

| VÍ DỤ | VÍ DỤ | VÍ DỤ |
|---|---|---|
| "Sửa số điện thoại" | "Duyệt yêu cầu mua hàng" | "Quản lý toàn bộ mua hàng" |

| XỬ LÝ | XỬ LÝ | XỬ LÝ |
|---|---|---|
| Gộp vào WF lớn hơn hoặc để ở danh sách FR | Giữ làm WF lõi: thiết kế, demo, test | Tách thành nhiều WF theo kết quả |

#### Quy tắc: 2-4 WF lõi • 3-7 bước mỗi WF • mỗi WF trả lời một pain point

W O R K F LO W / Đ Ị N H N G H Ĩ A & ĐẶ C TẢ L U Ồ N G N G H I Ệ P V Ụ **W08**

##### ĐẶC TẢ ĐẶT TÊN

## Đặt tên theo mẫu: động từ + đối tượng nghiệp vụ

Tên tốt đã nói lên kết quả mà workflow tạo ra.

✗ CHƯA **TỐT** ✓ TỐT

---

| Màn hình duyệt | Duyệt yêu cầu mua hàng |
|---|---|
| Module đơn hàng | Đặt hàng và thanh toán trực tuyến |
| Quản lý sản phẩm | Nhập kho lô hàng mới |
| Chức năng báo cáo | Lập báo cáo doanh thu tháng |
| Click nút Gửi | Gửi đơn xin nghỉ phép |

---

**Tránh trong tên: "màn hình", "module", "chức năng", "quản lý", tên nút. Thêm ngữ cảnh khi cần ("… tháng", "… trực tuyến").**

W O R K F LO W / Đ Ị N H N G H Ĩ A & ĐẶ C TẢ L U Ồ N G N G H I Ệ P V Ụ **W09**

##### ĐẶC TẢ MẪU ĐẶC TẢ

## Mẫu đặc tả workflow để nhóm điền

Một bảng cho mỗi WF lõi; dùng lại các mã FR, BR, UI, TC đã thống nhất trong đồ án.

---

**Trường Nội dung cần điền Gợi ý**

---

|  |  |  |
|---|---|---|
|  |  |  |
| Mã & tên | WF-__ · [Động từ + đối tượng] | Không chứa "màn hình", "module" |
| Actor | [Người / hệ thống tham gia] | Khớp danh sách actor |
| Trigger | [Sự kiện khởi động] | Ai / cái gì, khi nào |
| Precondition | [Điều kiện phải đúng trước] | Thường gắn BR |
| Happy path | 1. … 2. … 3. … | 3-7 bước, mỗi bước một actor |
| Điểm quyết định | [Rẽ nhánh theo BR-__] | Mỗi nhánh → một test |
| Exception | [Sai thì sao, thông báo gì] | Ít nhất một nhánh |
| Postcondition | [Trạng thái mới, actor nhận gì] | Khớp state machine |
| Truy vết | FR-__ · UI-__ · Service · TC-__ | Dùng cho ma trận truy vết |

---

W O R K F LO W / Đ Ị N H N G H Ĩ A & ĐẶ C TẢ L U Ồ N G N G H I Ệ P V Ụ **W10**

##### VÍ DỤ VÍ DỤ HOÀN CHỈNH

## WF-02 · Duyệt yêu cầu mua hàng

Một workflow lõi được đặc tả đủ bảy thành phần.

---

| ACTOR TRIGGER PRECONDITION | Nhân viên, Quản lý, Hệ thống email Nhân viên gửi yêu cầu Yêu cầu ở DRAFT, có ≥ 1 dòng hàng (BR-02) | HAPPY PATH Nhân viên gửi yêu cầu → hệ thống chuyển SUBMITTED Hệ thống kiểm tra hạn mức (BR-03) Quản lý xem và duyệt → APPROVED Hệ thống gửi email cho nhân viên |
|---|---|---|
| POSTCONDITION | APPROVED hoặc REJECTED, có lịch sử duyệt |  |
| TRUY VẾT | FR-04..06 · UI-03 · ReviewService · TC05-10 | EXCEPTION • Vượt hạn mức → chuyển cấp trên duyệt • Quản lý từ chối → REJECTED, bắt buộc ghi lý do • Thiếu dòng hàng → trả lại, không cho gửi (BR-02) |

---

W O R K F LO W / Đ Ị N H N G H Ĩ A & ĐẶ C TẢ L U Ồ N G N G H I Ệ P V Ụ **W11**

##### VÍ DỤ VÍ DỤ - ACTIVITY DIAGRAM

## WF-02 trên activity diagram có swimlane

Mỗi lane là một actor; điểm quyết định ghi mã business rule.

---

**NHÂN VIÊN Gửi yêu cầu Bổ sung dữ liệu Nhận kết quả**

##### FAIL · BR-02

---

##### OK

**HỆ THỐNG BR-03 Cập nhật trạng thái + gửi**

##### Kiểm tra dữ liệu

**hạn mức? email**

##### ≤ hạn mức > hạn mức

---

**QUẢN LÝ Cấp trên duyệt Quản lý duyệt / từ chối**

kết quả cấp trên

---

*Nét liền: luồng chính. Nét đứt: quay lại hoặc nhánh song song. Mỗi nhánh tại hình thoi sinh ra một test case.*

W O R K F LO W / Đ Ị N H N G H Ĩ A & ĐẶ C TẢ L U Ồ N G N G H I Ệ P V Ụ **W12**

##### VÍ DỤ VÍ DỤ - TRUY VẾT

## Từ workflow sang state machine và test case

Mỗi bước làm đối tượng đổi trạng thái; mỗi business rule có test, kể cả chuyển trạng thái bị cấm.

#### DRAFT SUBMITTED APPROVED hoặc REJECTED

---

**Bước của WF-02 Chuyển trạng thái Business rule Test case**

---

**Nhân viên gửi yêu cầu** DRAFT → SUBMITTED BR-02 · có ≥ 1 dòng hàng TC05 gửi hợp lệ · TC06 thiếu dòng hàng

---

##### Hệ thống kiểm tra hạn mức

---

##### Quản lý duyệt

---

##### Quản lý từ chối

---

##### (Chuyển bị cấm)

---

W O R K F LO W / Đ Ị N H N G H Ĩ A & ĐẶ C TẢ L U Ồ N G N G H I Ệ P V Ụ

SUBMITTED (giữ)

SUBMITTED → APPROVED

SUBMITTED → REJECTED

DRAFT → APPROVED

BR-03 · hạn mức theo cấp

Chỉ Quản lý được duyệt

Bắt buộc ghi lý do

Không được bỏ qua bước gửi

TC07 vượt hạn mức → cấp trên

TC08 duyệt · TC09 User không có quyền

TC10 từ chối thiếu lý do bị chặn

TC11 gọi API duyệt trên DRAFT bị chặn

**W13**

##### TỔNG KẾT TỰ KIỂM TRA

## Checklist trước khi chốt danh sách workflow

Dùng khi nhóm rà lại phần thiết kế, trước buổi review với giảng viên.

---

Mỗi WF đạt 5/5 câu kiểm tra nhanh **LỖI T HƯỜNG GẶP** Có 2-4 WF lõi, mỗi WF gắn một pain point

Tên theo mẫu động từ + đối tượng nghiệp vụ

Đủ 7 thành phần, có ít nhất một exception

Điểm quyết định ghi mã BR

Postcondition khớp state machine → chưa tới kết quả cho actor

##### Gọi màn hình là workflow

→ không có trigger và kết quả

##### Chỉ vẽ happy path

→ hội đồng hỏi "nếu sai thì sao?"

##### Workflow dừng ở "lưu thành công"

Mỗi nhánh rẽ có test case tương ứng **Demo khác workflow đã thiết kế**

→ mất tính truy vết

WF trong demo trùng WF đã thiết kế

---

W O R K F LO W / Đ Ị N H N G H Ĩ A & ĐẶ C TẢ L U Ồ N G N G H I Ệ P V Ụ **W14**

##### T Ó M TẮT

# Ba điều cần nhớ về workflow

**1 2 3**

##### Từ trigger đến kết quả

Workflow là chuỗi bước xuyên actor, kết thúc bằng giá trị nghiệp vụ - không phải chuỗi click.

##### Năm câu kiểm tra Một WF, cả chuỗi truy vết

Trigger, kết quả, thay đổi trạng thái, rẽ Cùng một WF đi qua activity, state, nhánh theo BR, ngôn ngữ nghiệp vụ. sequence, UI, demo và test. Thiếu một câu thì chưa phải workflow.

*Áp dụng ngay: viết lại danh sách workflow của nhóm theo mẫu đặc tả (W10) và chạy checklist (W14).*

**W15**