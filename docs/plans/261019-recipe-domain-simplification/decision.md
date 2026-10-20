# Recipe Domain Simplification Decision

## Mục tiêu

Giữ nghiệp vụ Recipe đủ đơn giản cho MVP quản lý công thức đồ uống. Hệ thống không có người duyệt riêng. Nhân sự R&D chịu trách nhiệm soạn và phát hành công thức.

## Thuật ngữ nghiệp vụ

Người dùng chỉ cần hiểu hai khái niệm:

- **Công thức:** Một sản phẩm, ví dụ Ô Long Sữa.
- **Phiên bản:** Bản chụp dữ liệu của công thức tại mỗi lần phát hành.

Không sử dụng các thuật ngữ `variant`, `clone` hoặc `revision` trên giao diện.

- **Tạo bản sao:** Sao chép dữ liệu sang một công thức độc lập có mã mới. Không lưu quan hệ với công thức nguồn.
- **Chỉnh sửa bản đã phát hành:** Tạo bản nháp mới trong cùng công thức. Khi phát hành, bản nháp trở thành phiên bản tiếp theo.
- Size Phê/La, nóng/lạnh và loại bao bì là lựa chọn định lượng bên trong công thức, không phải quan hệ giữa nhiều công thức.

## Trạng thái

Giao diện chỉ hiển thị ba trạng thái:

```text
Bản nháp -> Đã phát hành -> Đã lưu trữ
                |
                +-> Chỉnh sửa -> Bản nháp mới
```

- `Draft`: Đang soạn, được phép thiếu dữ liệu và lưu nhiều lần.
- `Published`: Đã phát hành, bất biến.
- `Archived`: Công thức không còn sử dụng thường xuyên nhưng vẫn được tra cứu.

Không còn các trạng thái `pending_approval`, `returned` và `cancelled`.

## Hành động trên giao diện

- Tạo công thức.
- Lưu bản nháp.
- Phát hành.
- Chỉnh sửa bản đã phát hành.
- Tạo bản sao.
- Lưu trữ hoặc khôi phục.

Không có màn hình, vai trò hoặc thao tác phê duyệt riêng.

## Quy tắc phát hành

Bản nháp được phép lưu khi chưa hoàn chỉnh. Chỉ hành động Phát hành mới kiểm tra đầy đủ:

- Có mã và tên công thức.
- Có sản lượng hợp lệ.
- Có ít nhất một nguyên liệu với định lượng hợp lệ.
- Có ít nhất một bước thực hiện.
- Thứ tự nguyên liệu và bước hợp lệ.
- Mọi ID tham chiếu và định lượng đều hợp lệ.

Bản đã phát hành không được cập nhật trực tiếp. Khi người dùng chọn Chỉnh sửa, hệ thống tạo một bản nháp mới bằng dữ liệu của bản đã phát hành hiện tại.

## Mô hình dữ liệu mục tiêu

```text
Recipe
- Id
- PublicId
- Code
- ArchivedAt
- CreatedByUserRef
- CreatedAt
- UpdatedByUserRef
- UpdatedAt

RecipeVersion
- Id
- PublicId
- RecipeId
- VersionNumber
- Status: draft | published
- Name
- Description
- PublishedAt
- PublishedByUserRef
- Yield
- Ingredients
- Steps
```

`RecipeVersion` tiếp tục chứa snapshot nguyên liệu, định lượng và quy trình để bảo vệ lịch sử đã phát hành.

## Thành phần đã loại bỏ khỏi Recipe Service

- Entity và bảng `RecipeVersionReview`.
- Các API `submit`, `approve`, `return` và `reviews`.
- `Recipe.SourceRecipeId`.
- `RecipeVersion.BasedOnVersionId`.
- Review comment và review history.
- Filter cho `pending_approval`, `returned`, `cancelled`.

## Thiết kế hiện tại

### Đơn vị đo

MVP vẫn quản lý `UnitCategory` để phân loại đơn vị, ví dụ Khối lượng, Thể tích, Số lượng hoặc Khẩu phần. Mỗi `Unit` thuộc đúng một `UnitCategory`.

`UnitCategory` chỉ cần:

- Mã.
- Tên.
- Mô tả tùy chọn.

`Unit` chỉ cần:

- Mã.
- Tên hiển thị.
- `UnitCategoryId`.
- Số chữ số thập phân dùng khi hiển thị.
- Trạng thái đang sử dụng hoặc ngừng sử dụng.

Không xây calculation engine trước khi có use case cụ thể. MVP chưa cần `IsBase`, `FactorToBase` hoặc `OffsetToBase`, vì hệ thống chưa thực hiện quy đổi tự động giữa các đơn vị.

Mã và category của Unit không được thay đổi sau khi Unit đã được một nguyên liệu hoặc công thức sử dụng. Khi khai báo sai, tạo Unit mới và ngừng sử dụng Unit cũ để không làm thay đổi dữ liệu lịch sử.

### Nhóm nguyên liệu

MVP vẫn quản lý `IngredientCategory` để biết nguyên liệu thuộc nhóm nào, ví dụ Trà, Sữa, Chất tạo ngọt, Topping hoặc Nguyên liệu pha chế khác. Mỗi `Ingredient` thuộc đúng một `IngredientCategory` và có một đơn vị mặc định.

`IngredientCategory` chỉ cần:

- Mã.
- Tên.
- Mô tả tùy chọn.

`Ingredient` giữ các trường tối thiểu:

- Mã.
- Tên.
- `IngredientCategoryId`.
- `DefaultUnitId`.
- Mô tả tùy chọn.
- Cảnh báo tùy chọn.
- Ảnh đại diện tùy chọn.
- Trạng thái đang sử dụng hoặc ngừng sử dụng.

Category dùng để phân loại và lọc, không chứa quy tắc nghiệp vụ phức tạp. Không quản lý supplier, tồn kho, lô hàng hoặc giá thành trong Recipe Service.

### API Recipe

Recipe editor dùng một full aggregate update cho thông tin chung, sản lượng, nguyên liệu, bước và media. Không duy trì các endpoint con trùng chức năng. Các hành động độc lập chỉ còn publish, copy, archive và activate.

### Media

Recipe chỉ lưu UUID tham chiếu MediaAsset, không giữ metadata hoặc trạng thái xử lý ảnh của Content Service.

### Concurrency

API Recipe không còn `ExpectedRowVersion` và `RowVersion` giả. Nếu sau này có nhu cầu nhiều người sửa đồng thời thì bổ sung concurrency token thật như một yêu cầu riêng.

### Catalog

Giữ `IngredientCategory`, `UnitCategory` và `Unit` vì chúng phục vụ phân loại nguyên liệu và đơn vị. Đây là dữ liệu danh mục ổn định, chỉ cần các thao tác xem danh sách, tạo, sửa thông tin hiển thị và ngừng sử dụng.

Không hard-delete category hoặc unit đã được tham chiếu. Category đang có phần tử sử dụng chỉ được ngừng sử dụng; dữ liệu lịch sử vẫn hiển thị bình thường, nhưng category hoặc unit đã ngừng sử dụng không được chọn cho dữ liệu mới.

## Ngoài phạm vi Recipe Service

- Chưa thiết kế calculation engine cho mức đường, mức đá hoặc quy đổi định lượng.
- Chưa quyết định schema cuối cùng cho size Phê/La, nóng/lạnh và bao bì.
- Không thay đổi Content, Identity, Audit, Gateway hoặc Worker trong đợt tinh giản này. Frontend chỉ cập nhật các adapter và form sử dụng trực tiếp Recipe API.
- Các consumer của API Recipe cần được cập nhật riêng vì endpoint và DTO đã được tinh gọn.
