# Transcript: New Recording 57.m4a

**Thời lượng:** ~21:53  
**Ghi chú:** Bản chép lời trung thực theo nội dung nghe được từ tệp ghi âm. Các đoạn bị nhiễu, nói nhỏ hoặc chồng chéo không nghe rõ được đánh dấu `[không rõ]`.

---

**[00:00 – 00:26]** *(Tiếng ồn nền, tiếng sột soạt, trao đổi nhỏ trước khi bắt đầu)*  
- **Thầy / Sinh viên:** `[không rõ]` ... số 2 ... `[không rõ]`  
- **Thầy:** Nhóm mấy?  
- **Sinh viên:** Nhóm 3.

**[00:27 – 00:39]**  
- **Thầy:** Sao có ba người vậy?  
- **Sinh viên:** Dạ nhóm em có ba.  
- **Sinh viên (khác):** Dạ nhóm em có ba người.  
- **Thầy:** Sao bữa bốn người lên hả?  
- **Sinh viên:** Dạ bạn này là bạn bên PRN ạ.  
- **Thầy:** Để thầy xem thử...  
- **Sinh viên:** `[không rõ]` ... ok.

**[00:40 – 01:07]**  
- **Thầy:** Sau này mấy cái slide này... em chỉ cho nó một vế thôi chứ đừng cho hai ý. Một ứng dụng, hai vai trò... nó bắt người ta phải suy nghĩ tới hai lần. Đơn giản thế này là tổng quan. Đơn giản thế này á là Firebase.  
- **Sinh viên:** Dạ.  
- **Thầy:** Ờ... đúng không? Khởi tạo Firebase, xác thực Firebase. Slide này á là liên quan tới kiến trúc hệ thống, kiến trúc app. Đúng không?  
- **Sinh viên:** Dạ.  
- **Thầy:** Kệ, bên trong thì mình sẽ mô tả nhưng mà MVVM cộng với Provider. Provider làm cái gì đó?

**[01:07 – 01:30]**  
- **Sinh viên:** Dạ cái Provider này là cái để... cung... cung cấp cái... mấy cái dịch vụ đưa cho... cho tới giống như mình import cái Firebase Authentication vào cái Firestore, thì nó sẽ... nó sẽ đưa... nó sẽ làm một cái cung cấp để mình có thể import vào cái Firestore... những cái... bên Firebase.  
- **Thầy:** Rồi.

**[01:31 – 02:27]**  
- **Thầy:** Đó là nó quản lý cái state ở bên trong ha. Còn Firestore là cái phần cuối ở dưới, dưới cái thằng Provider á là mình sẽ kết nối tới... Provider nó sẽ làm giống như là Model á. Hay là trong kiến trúc .NET mình nó là cái thằng Repository, nó là cái thằng nó đi gọi qua bên Firestore để lấy dữ liệu và cung cấp lên trên. ViewModel á nó có dữ liệu thì tự động cái cơ chế two-way binding thông qua mấy cái cơ chế... `[không rõ]`... Hiểu vấn đề không?  
- **Sinh viên:** Dạ hiểu.  
- **Thầy:** Là thằng ở dưới nó lấy dữ liệu và nó cập nhật lên ViewModel thì tự động View nó sẽ bị thay đổi. Và khi trên View á mà em edit á thì tự động ViewModel sẽ được cập nhật và nó sẽ lưu xuống... lưu xuống. Đó, thì cái luồng... nó là giống vậy. Dùng Firebase SDK để gọi qua bên kia đúng không?  
- **Sinh viên:** Dạ.

**[02:28 – 02:49]** *(Khoảng lặng, tiếng thao tác máy tính và tiếng ồn nền)*

**[02:50 – 03:31]**  
- **Thầy:** Tụi em dùng Cloud Storage trong cái case nào? Trong tình huống nào?  
- **Sinh viên:** À cái Cloud Storage này là tụi em dùng để lưu mấy cái ảnh... với cái hình đồ cho... `[không rõ]`...  
- **Thầy:** Em sử dụng dịch vụ của ai?  
- **Sinh viên:** Dạ em sử dụng cái của Firebase luôn.  
- **Thầy:** Firebase. Em có tốn tiền không?  
- **Sinh viên:** Dạ có. Lúc đầu... à lúc đầu em cái gói... gói free á, không được dùng. Nhưng mà phải nâng lên gói Blaze... nhưng mà lúc đó em phải nạp vô... mấy đô... tuần sau thì nó mới hoàn lại cái phần đó.  
- **Thầy:** Nó giữ em bao nhiêu tiền?  
- **Sinh viên:** Dạ... hôm bữa em bị trừ sáu trăm mấy.  
- **Thầy:** Ờ, như thầy cũng bị nó giữ.

**[03:32 – 04:44]**  
- **Thầy:** Nhưng mà thầy bảo á, mấy cái tool này thầy làm Firebase á, nhưng mà nó không cho lưu trữ. Tức là thầy dùng cái bản free. Em đang dùng bản trả tiền, thầy dùng bản free. Bản free sau đó thầy qua bên Cloudflare thầy dùng cái con R2 của Cloudflare. Mở ra thì nó cho 10 GB lưu trữ. Nè thầy cho con này nó... cái tool này thầy code bằng... thầy xài này luôn. Tức là không dùng REST API quỷ gì hết á. Dùng Firestore với... `[không rõ]`. Vậy nha. Cộng tiền... cộng điểm cho tốn tiền ha. *(cười)*  
- **Sinh viên:** `[không rõ]` ... trước tại em không có để ý bên đó.  
- **Thầy:** Ờ... logic của tụi em cũng ổn đúng không? Do em hiểu về dịch vụ này rồi nên cứ `[không rõ]` đúng không? Rồi ok, slide này... Nhóm này ba người đúng không?  
- **Sinh viên:** Dạ.  
- **Thầy:** Rồi, qua slide công nghệ nha. Rồi, bắt đầu cho thầy coi demo luôn đi ha.  
- **Sinh viên:** Dạ.

**[04:45 – 05:57]**  
- **Thầy:** Rồi, lên web đi. Nãy... mở admin... Dương Quốc Thái. Gọi đò. Chưa? Biết rồi hả? Dương Hồng Thái, Dương Quốc Thái... Ờ gọi tên... ca sĩ hát bài đó là Dương Hồng Thái. Rồi giờ tạo một món mới đi.  
- **Sinh viên:** Dạ ở trên đây tụi em có tạo món mới...  
- **Thầy:** Anh ơi!  
- **Nhân viên / Người khác:** Dạ.  
- **Thầy:** Em giúp thầy một việc với... Em cho thằng này nó đi thẳng đi về dưới giúp thầy. `[không rõ]` ... Nó nằm trong cùng cái hộp á, để thầy gửi cho em.  
*(Khoảng lặng ngắn, tiếng ho nhẹ)*

**[05:58 – 06:44]**  
- **Thầy:** Này có sử dụng AI để generate mấy cái bước này không?  
- **Sinh viên:** Bên web thì mới có, còn cái này là bên em làm mobile nó...  
- **Thầy:** Này có thiết kế database bên... `[không rõ]`...  
- **Sinh viên:** Dạ không, cái này thì em có... dùng Firebase là mấy cái... `[không rõ]`... `[không rõ]` ở trên cái...  
- **Thầy:** Ok.

**[06:45 – 07:33]**  
- **Thầy:** Tuần sau thì... một nhánh liên quan tới cái matcha grinder, cái máy IoT để nghiền matcha... matcha.  
- **Sinh viên:** Là cái máy đó chuyên về matcha luôn hả thầy?  
- **Thầy:** Chuyên về matcha. Nhưng mà công thức thì mạnh lắm. Là tụi Đài Loan muốn làm, mà nó phải... cái app, cái timer theo hướng là mấy giây nó làm gì, mấy giây nó làm gì, làm gì, làm gì, rồi nó đo đúng nhiệt, đúng này đúng kia, thì nó làm cái máy matcha đó.  
- **Sinh viên:** `[không rõ]`  
- **Thầy:** Matcha whisk, tức là em biết giống không, bột trà đưa vô tách trà rồi nó...  
- **Sinh viên:** Xong rồi đánh lên...  
- **Thầy:** Nó liên quan các công đoạn của một cái... nhưng quan trọng nhất là cái tay nghề của thằng pha chế. Giờ mình sẽ... mình sẽ số hóa AI cái bước đó, mình theo dõi, tức là theo dõi độ của cái máy để nó real-time với tất cả mọi thứ.

**[07:34 – 08:38]**  
- **Sinh viên:** Cái máy đó hình như ở Việt Nam có chưa thầy?  
- **Thầy:** Hình như bên Nhật có, bên Đài Loan... Đài Loan thì... thì đấy, thầy đang làm với Đài Loan mà.  
- **Sinh viên:** Cái đó mình... nó tích hợp cảm biến luôn hả thầy?  
- **Thầy:** Ờ nó tích hợp, tức là nó phải có cảm biến với bài toán mà quản lý... hay là cái gì đó. Này là thầy nói ngoài lề một tí nha.  
- **Sinh viên:** `[không rõ]` ... Mình chỉ có cái máy thôi đúng không? Mình chỉ làm app thôi?  
- **Thầy:** Tức là đang có một dự án để làm cái máy đó. Hiểu ý không?  
- **Sinh viên:** Dạ hiểu. Một dự án để làm luôn cái máy đó chứ...  
- **Sinh viên (khác):** Còn tụi em là muốn bưng cái máy đó về nghiên cứu luôn. *(cười)*  
- **Thầy:** Reverse... reverse... *(cười)* ... mã nguồn. Không thì cái máy đó nó có luôn.  
- **Sinh viên:** Dạ. Chỉ tiền mua máy luôn về chơi.  
*(Tiếng trao đổi nhỏ, không rõ)*

**[08:39 – 10:00]**  
- **Sinh viên:** Cái này là giá thị trường là nhiêu thầy? Cái này giá thị trường hình như có mua thì thầy mua...  
- **Thầy:** Cái này hả? Cái này đang nhập nguyên... `[không rõ]`...  
- **Sinh viên:** À đang nhập hả?  
- **Thầy:** Tức là cái style, cái concept là nó là giống vậy, nhưng mà nó... nó phức tạp hơn, tức là nó giúp đào tạo cho mấy cái ông... mấy ông mà pha matcha. Một phần matcha ăn lên tới... mấy trăm ngàn.  
- **Sinh viên:** Mấy trăm ngàn...  
- **Thầy:** Mấy trăm ngàn, rồi nó custom rồi nó có profile, kết hợp giữa người với máy. Người thì phải đeo vô tay vô... lắc, phải làm cái này làm cái kia. Thì cái đó nó đòi hỏi cái mức độ chính xác đến mức độ mà... Nó kiểu giống như em ăn món Nhật mà có ông đầu bếp Omakase á, tụi bay hiểu không?  
- **Sinh viên:** Dạ hiểu. Kiểu độ chính xác nó tinh xảo nhiều hơn.  
- **Thầy:** Tinh xảo nhiều hơn, còn mang tính chất biểu diễn nhiều hơn.  
- **Sinh viên:** Dạ.  
- **Thầy:** Thì cái này nó cũng góp phần vô bên trong cái việc... cái chuyện đấy. Thì build một cái máy, cái máy thì nhập về, ba quỷ thì nhập về đâu có khó đâu. Mình phân rã thành những cái động cơ mình nhập về, sau đó mình cho nó... để mình điều khiển được nó. Mình điều khiển nó, mình kiểm soát, chuẩn hóa thao tác nhân viên... Ý tưởng cơ bản của nó cũng từ cái nền tảng này nên thầy trao đổi với tụi em luôn.  
- **Sinh viên:** Dạ.  
- **Thầy:** Đã thêm nhập được món mới rồi đúng không?

**[10:01 – 11:16]**  
- **Thầy:** Thành ra AI nó hay á, là nó hay ở chỗ là... nó học từ... tức là bài này nó hay, mà tụi em mới áp dụng được cho cái... cái này xem làm sao á, tại vì theo mô tả... cà phê hay gì đó. Thì em nạp một cái tri thức gì đó, ví dụ như là cà phê sữa. Thì nói là cà phê sữa dừa thì trước đó em đã có một cái rule dành cho cái ông barista. Em nạp vào bên trong cái barista knowledge, nguyên tắc là cà phê phải có trước, sau đó mới tới cái thành phần liên quan tới sữa, syrup gì đó, rồi sau đó mới là topping, rồi sau đó mới là đá. Vậy thì khi vừa... gõ ba hoa ba hoa tới cái kịch...  
- **Sinh viên:** Là ra hết...  
- **Thầy:** Nó tự nó ra mấy cái... cái đó. Dựa vào cái... dựa vào cái AI mà mình đã... mình đã train cho nó về các nguyên tắc pha chế căn bản.  
- **Sinh viên:** Dạ. Là mình sẽ nạp bộ nguyên tắc vô rồi nó tự gen ra các bước cho mình luôn.  
- **Thầy:** Đúng rồi, rồi mình chỉ cần accept nó thôi chứ không phải là mình... mình tự điền. Hiểu... hiểu logic của cái này á, nó ăn tiền ở chỗ mà cái hệ thống mà gọi là... smart này kia rồi á là nó giống như vậy.  
- **Sinh viên:** Dạ.

**[11:17 – 12:36]**  
- **Thầy:** Rồi theo chiều ngược lại ví dụ như ở ngoài ứng dụng nó là gì? Người ta thao tác, người ta có cái màn hình... đặt ở trên, có camera xuống. Thì nó sẽ tracking được và nó biết được ở thời điểm này cái gì nó đang... nó đang ở bước nào. Tức là em đang ở bước pha chế số 3.  
- **Sinh viên:** Là nó phát hiện ra bước...  
- **Thầy:** Ờ chứ không phải là em làm bước số 3 xong nhấn nút số 3 qua bước số 4 mà...  
- **Sinh viên:** Nó tự nó chuyển bước. Kiểu như là mình có sẽ có kiểu giả lập cái camera để quay là mình tới cái... cái giai đoạn đó là người ta đang... tới bước nào rồi. Tới cái này nó sẽ tự phát hiện...  
- **Thầy:** Ờ là nó tự phát hiện... Thì nó sẽ kiểu nó... kết hợp với cả mắt cam... À nó là một cái mắt cam trong cái... cái space của để pha chế. Thì nó mới là Smart Space, AI Space. Là không gian đó bỏ vào bên trong đó anh pha chế mà nằm trong đó là tụi tui biết hết tất cả mọi thứ. Tôi dùng hai camera: một cái camera thao tác ở cái bàn, một thao tác camera thao tác quay... quay thẳng là tui biết cái gì nó đang diễn ra. Và nó cảnh báo... Hiểu... hiểu ý tưởng? Thì như vậy nó biến một cái... cái chỗ kiosk đó trở thành một cái chỗ nó thông minh. Chỗ thông minh nhưng mà vẫn đảm bảo tính private bằng cách là mình chỉ quay vào chỗ anh barista...  
- **Sinh viên:** Chỉ quay cái chỗ... cái khúc mà ảnh làm thôi, cái tay ảnh...

**[12:36 – 13:17]**  
- **Thầy:** Không biết... ở bên đây nó có team nó làm cái tay robot luôn, đúng y chang luôn. Thầy nói hơi... hơi bị robot hơn là bị nhân sinh. Tương lai nó là gì? Anh làm khoảng chừng 3 tháng đi... tui khỏi cần anh nữa. Có phải mấy thằng Ấn Độ nó training cho mấy con robot để làm việc thay thế không? Đeo cái... đeo cái ấy vô á... Rồi sau đó mấy thằng... bên đây giờ mấy con robot nó gắp... gắp đồ được hết rồi nè. Cái... cái team này nè nó làm tay robot bên đây nó đi vô... góc này nè.  
- **Sinh viên:** Tay robot...  
- **Thầy:** Làm cái tay robot... Thôi thì nói ngoài lề chút xíu.  
- **Sinh viên:** Dạ.

**[13:18 – 14:42]**  
- **Thầy:** Rồi, thôi nhập đi. Thầy... đang nói robot... Nhập đi, nhập đi. Nhập hết công thức chưa?  
- **Sinh viên:** Dạ hết... một cái `[không rõ]`... công thức không?  
- **Thầy:** Dạ... nhập vô đi. Có hình không?  
- **Sinh viên:** Dạ hiện tại chưa có... có cái... `[không rõ]`...  
- **Thầy:** Rồi ok. Rồi làm cái push noti cho thầy.  
- **Sinh viên:** Push noti hả? Cái thông báo, thông báo, thông báo.  
- **Thầy:** Ừ. Nói, gõ vô.  
- **Sinh viên:** "Chúc bạn ngủ ngon." *(cười)*  
- **Thầy:** Rồi ok. Rồi... Firebase Storage làm rồi đúng không?  
- **Sinh viên:** Dạ.  
- **Thầy:** Rồi Crashlytics thì demo đúng không?  
- **Sinh viên:** Dạ đúng rồi.  
*(Thao tác kiểm tra)*  
- **Thầy:** Rồi gửi đi. Nhanh vậy. Qua giờ 40 đúng không?  
- **Sinh viên:** Dạ đúng rồi.  
- **Thầy:** Rồi, giỏi. Tiếp.

**[14:43 – 16:26]**  
- **Thầy:** Xử lý xong rồi... còn gì nữa ta? Remote Config có không?  
- **Sinh viên:** Dạ có. Remote Config.  
- **Thầy:** Thấy qua bên admin...  
- **Sinh viên:** Dạ tụi em có làm admin của bên... ở bên đây. Cái này em chỉ áp lên cái danh sách 5 sản phẩm hay gì... cái list...  
- **Thầy:** Ảnh hưởng gì tới dưới này?  
- **Sinh viên:** Dạ ảnh hưởng tới cái... `[không rõ]`... cập nhật theo thời gian thực luôn á... cập nhật thành 5 sản phẩm... Nó load... có muốn nó cập nhật thời gian thực luôn không thầy?  
- **Thầy:** Em thoát app luôn hả? Ở ngay chỗ chỉ cần cập nhật... bấm cập nhật cái là... trên đó từ 50 xuống thành còn 5 thôi.  
- **Sinh viên:** Ừ chứ giới hạn... sổ công thức đi.  
- **Thầy:** Cái này bạn ấy...  
- **Sinh viên:** Em giải thích hết rồi... `[không rõ]`... 5 đúng không?  
- **Sinh viên (khác):** Dạ đúng rồi.

**[16:26 – 17:57]**  
- **Thầy:** Rồi ok. Còn dịch vụ nào? Analytics? Phân tích cái app, mấy cái thao tác ở đây bên kia?  
- **Sinh viên:** Dạ.  
- **Thầy:** Hồi xưa nhóm nào cũng quên á, giờ không có nhóm nào quên. Quên được! Bỏ nguyên cái yêu cầu vào bên trong con AI nó thống kê thành cái plan rồi.  
- **Sinh viên:** Analytics... phân tích gì á? Analytics... chỗ phân tích... Cái... `[không rõ]`...  
- **Thầy:** Một cái app hiện đại có... `[không rõ]`... tại nhiều khi thấy trong đây quá trời... `[không rõ]`...  
*(Tiếng trao đổi nhỏ giữa các sinh viên, không rõ)*  
- **Thầy:** Nói... nó không có chịu đi sớm, nó không có gì... Kêu tới trưa tới giờ gọi... bắt đầu lò dò đi, đi tới nhà nó lên. Rồi đúng không?  
- **Sinh viên:** Dạ.  
- **Thầy:** Đâu, báo cáo... Ok.

**[17:58 – 19:46]**  
- **Thầy:** Nhớ này ba người đúng không?  
- **Sinh viên:** Dạ đúng rồi.  
- **Sinh viên:** Thầy sẵn review cái ERD luôn... trên...  
- **Thầy:** Bữa sau con... đi ngủ đi... Cái này thầy bị... Nguyễn Phạm Xuân Sơn... 27 rưỡi, 3 người, tự chia.  
- **Sinh viên:** Dạ, 27 rưỡi 3 người...  
- **Thầy:** 9.2. Tại á... quy trình nó đơn giản, thêm cho nó show lên thôi. Tụi em làm full công nghệ... công nghệ này kia, chứ còn... AI này kia thì nó chưa mạnh lắm nha.  
- **Sinh viên:** Dạ. Vậy thì bạn... Sơn, Tuấn, Thái... Sơn... bạn Sơn 9 chấm... chấm hai. Thái 9.2, em 9.1.  
- **Thầy:** Chi? Nếu mà đều nhau... `[không rõ]`...  
- **Sinh viên:** Tại cộng... *(cười)* ... kỳ vậy.  
- **Thầy:** Rồi, Lab 1 nhiêu?  
- **Sinh viên:** Dạ... nhớ số... hình như là 8.6. 8.6 tại vì hôm đó đi... bị dính cái luồng ấy á.  
- **Thầy:** Thầy ghi nó 8.6 hả? Ừ để bên kia...  
- **Sinh viên:** Lab 2 B+... thầy nói 8 rưỡi á.  
- **Thầy:** Nó thích cho 8.6, cho 8.5... Thôi từ từ đi. Rồi, Sơn 9... nói chung là tụi em 8.5 hết á, này thầy công bố điểm nè nha. Đi thi tốt nha.  
- **Sinh viên:** Dạ.

**[19:47 – 21:53]**  
- **Sinh viên:** Dạ thầy ơi, giờ cho em hỏi cái chỗ mà PRN hồi nãy thầy nói là... em sẽ chấm về cái ERD, xong rồi chấm về cái...  
- **Thầy:** Thầy mở cái C1E ra trước. C1 là kiến trúc tổng quan của các thành phần trong hệ thống. Thầy kiểm tra coi có gateway không, rồi có các service ở bên trong hay không, rồi thầy kiểm tra cái phần mà trung gian giao tiếp là có Kafka không, hay có Redis không, có cả hai cái thì điểm cao hơn. Rồi tiếp tục là thầy kiểm tra lưu trữ database. Rồi, sau khi kiểm tra đó xong thì thầy mở Docker lên, thầy coi xem coi mấy cái em vẽ trong Docker có không. Sau đó thầy kiểm tra cái việc em connect vào Docker database coi có được hay không. Được không?  
- **Sinh viên:** Dạ được.  
- **Thầy:** Rồi tiếp theo là thầy sẽ kiểm tra cái đường liên kết từ cái gateway vô trong mấy cái service cấu hình ở đâu. Rồi kế tiếp đó là kiểm tra các giao thức HTTP thông qua cái Swagger. Kiểm tra danh sách các Swagger. Tiếp tục đó là kiểm tra cái gRPC... cơ chế giao tiếp... message gửi và message nhận ở đâu, tại sao sử dụng cái đó. Rồi xong cái luồng đó thì mới tới cái luồng... demo... Nói chung là có hết. Chung là phải học. Hiểu được bài học thì mới đạt được yêu cầu.  
- **Sinh viên:** Dạ. Cách mà mình làm theo... vẽ từng... vẽ... sao cho nó mượt. Nói chung là làm xong...  
- **Thầy:** Điểm của môn PRN sẽ thấp hơn PRM. PRN thầy kỳ vọng nhiều hơn, còn PRM thì UI này kia đẹp, tại vì điểm môn này là môn client, nên điểm nó sẽ nới thoải mái, đúng tiêu chí là được. Ha. Rồi, vậy nha.  
- **Sinh viên:** Dạ ok cảm ơn thầy. Em chào thầy.
