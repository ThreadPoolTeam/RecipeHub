# Backend 04: Chuẩn Quản Trị Cơ Sở Dữ Liệu DB-First (Bắt Buộc)

> **Quyết định ngày 2026-10-29:** Toàn bộ hệ thống Backend RecipeHub áp dụng quy chuẩn **Database-First (DB-First)**.  
> Cấu trúc PostgreSQL là Nguồn Sự Thật Duy Nhất (Single Source of Truth - SSOT).  
> **TUYỆT ĐỐI CẤM** dùng EF Code First hoặc EF Migrations để quản lý schema database.

---

## 1. Lưu Trữ Schema & Quản Lý Phiên Bản

Mỗi service giữ một bộ tài liệu và script SQL chính thức trong thư mục:
`docs/database-schema/<service-name>-db/`

Cấu trúc chuẩn của một thư mục database service:
```text
docs/database-schema/<service>-db/
├── README.md                           # Ghi chú tổng quan schema
├── RecipeHub.<Service>.dbml            # Sơ đồ thiết kế DBML (để trực quan hóa trên dbdocs/dbdiagram)
├── RecipeHub.<Service>.postgres        # DDL hoàn chỉnh khởi tạo database trống
└── migrations/                         # Thư mục chứa các script nâng cấp tăng dần (incremental SQL)
    ├── 20261028_seed_initial.sql
    └── 20261031_add_new_columns.sql
```

### Nguyên Tắc Quản Trị Schema:
1. **Thiết kế trước trên DBML/SQL:** Trước khi viết code, phải cập nhật file `.dbml` và `.postgres` tại `docs/database-schema/`.
2. **Không chạy lại DDL khởi tạo trên DB đang có dữ liệu:** Mọi thay đổi schema trên database có dữ liệu phải được thực hiện bằng script SQL tăng dần trong thư mục `migrations/`.
3. **Không tạo bảng giả:** Service chưa cần bảng thì không tạo schema giả chỉ để đối phó thủ tục.

---

## 2. Quy Định Với Entity Framework Core

### 2.1. Điều Cấm Tuyệt Đối:
- **CẤM** chạy lệnh `dotnet ef migrations add`.
- **CẤM** chạy lệnh `dotnet ef database update`.
- **CẤM** gọi `Database.Migrate()`, `Database.MigrateAsync()`, `EnsureCreated()`, `EnsureDeleted()` trong code API, Background Worker hay Test runner.
- **CẤM** dùng C# Model để sinh cấu trúc DB.

### 2.2. Quy Chuẩn Mapping Trong Infrastructure:
1. **Tổ chức thư mục:** Toàn bộ mapping đặt trong `RecipeHub.<Service>.Infrastructure/Data/`:
   - `<Service>DbContext.cs`: Kế thừa `DbContext`.
   - `Configurations/<Entity>Configuration.cs`: Kế thừa `IEntityTypeConfiguration<T>`.
2. **Cập nhật Mapping Thủ Công hoặc Scaffold có kiểm soát:**
   - Khi DB thêm/sửa/xóa cột, dev/AI cập nhật Entity C# thuần trong `Domain` và file `Configuration` trong `Infrastructure/Data/Configurations/`.
   - Đối chiếu chính xác: Tên bảng (`ToTable`), tên cột (`HasColumnName`), kiểu dữ liệu, nullability (`IsRequired`), giá trị mặc định (`HasDefaultValueSql`), Primary Key (`HasKey`), Foreign Key, Unique Index.
   - Nếu dùng công cụ scaffold: Chỉ sinh ra thư mục tạm để review, không dùng cờ `--force` đè lên Domain hoặc file viết tay.
3. **Domain Entity Thuần Khiết:**
   - Các class Entity trong `Domain/Entities/` phải là C# thuần (POCO), không phụ thuộc vào `Microsoft.EntityFrameworkCore` hay thuộc tính `[Table]`, `[Column]`. Mọi cấu hình mapping nằm gọn trong Infrastructure.
