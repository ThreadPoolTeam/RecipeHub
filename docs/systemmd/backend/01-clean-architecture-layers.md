# Backend 01: Kiến Trúc Clean Architecture 4 Tầng

## 1. Nguyên Tắc Chiều Phụ Thuộc (Dependency Rule)

Mọi service backend trong `src/backend/Services/<ServiceName>/` đều tuân thủ nghiêm ngặt mô hình Clean Architecture 4 tầng. Chiều phụ thuộc đi từ ngoài vào trong:

```text
[ Api ] --------+
   |            |
   v            v
[ Infrastructure ] ---> [ Application ] ---> [ Domain ]
                             |                  ^
                             v                  |
                     [ BuildingBlocks ] --------+
```

### Chiều Phụ Thuộc Bắt Buộc:
1. **Domain:**
   - Độc lập hoàn toàn. KHÔNG phụ thuộc vào bất kỳ layer nào khác, không phụ thuộc EF Core, không phụ thuộc ASP.NET Core.
   - Chứa: Entities nghiệp vụ thuần C#, Value Objects, Enums, Constants, Domain Exceptions.
2. **Application:**
   - Phụ thuộc vào `Domain` và `RecipeHub.BuildingBlocks`.
   - Chứa: Use cases, Application Services, Interfaces Repository/Client, DTOs, Validation logic, Application Exceptions.
   - KHÔNG phụ thuộc vào Infrastructure hoặc EF Core.
3. **Infrastructure:**
   - Phụ thuộc vào `Application` và `Domain`.
   - Chứa: Hiện thực hóa DbContext (`<Service>DbContext`), Entity Type Configurations (DB-First mapping), Repository Implementations, External Clients (gRPC Client, Redis publisher), Security Services.
4. **Api:**
   - Phụ thuộc vào `Infrastructure`, `Application`, và `RecipeHub.BuildingBlocks`.
   - Chứa: ASP.NET Core Controllers, Exception Filters/Handlers, Swagger configuration, Authentication Handlers, Middleware, `Program.cs`.

---

## 2. Thư Viện Dùng Chung: `RecipeHub.BuildingBlocks`

Đặt tại `src/backend/BuildingBlocks/RecipeHub.BuildingBlocks/`.
- Cung cấp:
  - `EventEnvelope<T>`: Cấu trúc phong bì chuẩn cho mọi sự kiện truyền qua Redis Streams.
  - Base options & cấu hình chung.
  - Các tiện ích serialization, paging metadata, shared value types.
- Tất cả microservices dùng chung thư viện này để bảo đảm tính tương thích giao thức.

---

## 3. Quy Tắc Đặt Tên & Cấu Trúc Solution

Mỗi Microservice tạo thành một bộ 4 project con:
- `RecipeHub.<Service>.Domain`
- `RecipeHub.<Service>.Application`
- `RecipeHub.<Service>.Infrastructure`
- `RecipeHub.<Service>.Api`

Tất cả đều nằm chung trong Solution chính: `src/backend/RecipeHub.sln`.
Tuyệt đối không tạo project Persistence riêng biệt phá vỡ quy chuẩn 4 tầng này.
