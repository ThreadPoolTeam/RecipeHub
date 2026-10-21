# AGENT EXECUTION PROMPTS FOR RECIPEHUB (TASKS 1.1 TO 1.8)
*Production-ready English prompts for autonomous AI coding agents to implement and verify each task and subtask.*
*Aligned 100% with Identity.dbml and RecipeHub Clean Architecture.*
*Path: RecipeHub/docs/plans/04-agent-execution-prompts.md*

---

## Architecture & Project Context (Reference for all Prompts)

- **Root Directory**: `RecipeHub/src/backend`
- **Solution**: `RecipeHub.sln`
- **Tech Stack**: .NET 8, C#, Clean Architecture (Domain -> Application -> Infrastructure -> Api), PostgreSQL, EF Core, YARP Reverse Proxy (port 5000), Redis Streams, gRPC.
- **Database Schema & Naming**:
  - Identity DB: `recipehub_identity` (Schema: `identity_db` in PostgreSQL as specified in `Identity.dbml`).
  - Recipe DB: `recipehub_recipe` (Schema: `public` or `recipe_db`).
- **Strict Guidelines**:
  - Maintain Domain layer purity (no EF Core or framework dependencies in Domain).
  - Use `decimal` for all quantities, factors, dimensions, and yields (never `float` or `double`).
  - Follow RESTful API naming conventions under `/api/v1/...`.
  - For Identity: Strictly follow `Identity.dbml` table schemas, types, and column names (`user_account`, `auth_credential`, `role`, `user_role`, `user_session`).
  - For Security: Passwords must be hashed using `IPasswordHasher<UserAccount>`. Session/Refresh tokens must be stored as SHA-256 hashes in `user_session.session_token_hash`.
  - In `RecipeHub.BuildingBlocks`: Centralize authorization helpers (`Permissions`, `RolePermissionMap`, `[HasPermission]`, `AddRecipeHubAuth`).

---

## Task 1.1: [Identity] Login, Hash Credentials & JWT Token Issuance (FR-AUTH-01, NFR-SEC-02)

### Complete Task Prompt
```markdown
You are an expert .NET 8 software engineer working on RecipeHub.
Your task is to implement Task 1.1: [Identity] Authentication, Password Hashing & JWT Token Issuance in `RecipeHub.Identity.*`.
This implementation must strictly match the database design in `Identity.dbml`.

### Context & Database Specifications (`Identity.dbml`):
1. Schema: `identity_db`
2. Tables:
   - `identity_db.user_account`:
     - `id` (bigint PK, increment)
     - `public_id` (uuid, not null, unique) -> used as public ID, gRPC reference, and JWT `sub` claim
     - `user_name` (text, not null)
     - `normalized_user_name` (text, not null, unique, uppercase)
     - `email` (text, nullable)
     - `normalized_email` (text, nullable, unique, uppercase)
     - `display_name` (text, not null)
     - `state` (text, not null, default: 'active') -> values: 'active', 'locked', 'deactivated'
     - `last_login_at` (timestamptz, nullable)
     - `created_at` (timestamptz, not null, default: now)
     - `updated_at` (timestamptz, not null, default: now)
     - Index on `state`: `user_account_state_idx`
   - `identity_db.auth_credential`:
     - `id` (bigint PK, increment)
     - `user_account_id` (bigint, not null, unique FK to user_account.id, delete: cascade)
     - `password_hash` (text, nullable)
     - `created_at` (timestamptz, not null)
     - `updated_at` (timestamptz, not null)
   - `identity_db.role`:
     - `id` (bigint PK, increment)
     - `name` (text, not null, e.g. "Admin", "RndStaff", "Viewer")
     - `normalized_name` (text, not null, unique, e.g. "ADMIN", "RNDSTAFF", "VIEWER")
     - `description` (text, nullable)
     - `created_at` (timestamptz, not null)
   - `identity_db.user_role`:
     - `user_account_id` (bigint, not null)
     - `role_id` (bigint, not null)
     - Composite PK `(user_account_id, role_id)`
     - `assigned_at` (timestamptz, not null)
     - `assigned_by_user_ref` (uuid, nullable)
   - `identity_db.user_session`:
     - `id` (bigint PK, increment)
     - `session_token_hash` (text, not null, unique) -> stores SHA-256 hash of refresh token
     - `user_account_id` (bigint, not null, FK to user_account.id, delete: cascade)
     - `created_at` (timestamptz, not null)
     - `last_activity_at` (timestamptz, not null)
     - `expires_at` (timestamptz, not null)
     - `revoked_at` (timestamptz, nullable) -> null means active session, non-null means revoked
     - `ip_address` (string/IPAddress, nullable)
     - `user_agent` (text, nullable)

### Objectives & DoD:
1. Entity Design (`RecipeHub.Identity.Domain`):
   - Create entities: `UserAccount`, `AuthCredential`, `Role`, `UserRole`, `UserSession` matching all fields above.
   - Domain logic: `UserAccount` has navigation to `AuthCredential`, `ICollection<UserRole>`, `ICollection<UserSession>`.
2. Password Hashing:
   - Implement `IPasswordHasher<UserAccount>` using standard ASP.NET Core Identity password hasher (PBKDF2 with HMAC-SHA512).
   - Never store plain text passwords.
3. EF Core DbContext & Migrations (`RecipeHub.Identity.Infrastructure`):
   - Install packages: `Microsoft.EntityFrameworkCore`, `Npgsql.EntityFrameworkCore.PostgreSQL`, `Microsoft.EntityFrameworkCore.Design`.
   - Implement `IdentityDbContext`:
     - Configure schema `identity_db`.
     - Configure Fluent API: column types, indexes, unique keys, and cascading relationships.
   - Implement `IdentityDbSeeder` executed on startup:
     - Automatically seed roles: `Admin` (id=1), `RndStaff` (id=2), `Viewer` (id=3).
     - Automatically seed 3 test accounts with hashed passwords:
       - `admin` (Role: Admin, email: admin@recipehub.local, display_name: "System Administrator")
       - `rnd_staff` (Role: RndStaff, email: rnd@recipehub.local, display_name: "R&D Specialist")
       - `viewer` (Role: Viewer, email: viewer@recipehub.local, display_name: "Recipe Viewer")
4. Role-to-Permission Mapping & JWT Service:
   - In `RecipeHub.BuildingBlocks`, define `Permissions` static class and `RolePermissionMap`:
     - Admin: all permissions.
     - RndStaff: `Recipes.*`, `Ingredients.*`, `Units.*`, `AI.*`.
     - Viewer: `Recipes.View`, `Ingredients.View`, `Units.View`.
   - In `RecipeHub.Identity.Application`, create `IJwtTokenService`:
     - Generate JWT Access Token (15 min): `sub = public_id.ToString()`, `name = user_name`, `email = email`, `display_name = display_name`, role claims, and `permission` claims mapped from assigned roles.
     - Generate secure random Refresh Token (64-byte cryptographic string).
     - Compute SHA-256 hash of Refresh Token.
     - Store session into `identity_db.user_session`.
     - Update `last_login_at` in `user_account`.
5. Login API Endpoint:
   - Implement `POST /api/v1/identity/auth/login`:
     - Accepts `{ "username": "...", "password": "..." }`.
     - Lookup by `normalized_user_name == username.ToUpperInvariant()` (or normalized email).
     - If user does not exist, password hash does not match, or `state != "active"`: return `401 Unauthorized` with generic message `{"error": "Invalid username or password"}` (prevents username enumeration).
     - If valid: return `200 OK` with:
       ```json
       {
         "accessToken": "...",
         "refreshToken": "...",
         "tokenType": "Bearer",
         "expiresIn": 900,
         "user": {
           "id": "public_id_guid",
           "username": "admin",
           "displayName": "System Administrator",
           "email": "admin@recipehub.local",
           "roles": ["Admin"]
         }
       }
       ```
6. Verification:
   - Run `dotnet build src/backend/RecipeHub.sln` -> 0 errors.
   - Verify DbSeeder creates the tables and seeds default users.
   - Test login with valid credentials (returns 200 + tokens) and invalid credentials (returns 401).
```

---

## Task 1.2: [Identity] Logout & Session Expiration with UserSession (FR-AUTH-03)

### Complete Task Prompt
```markdown
You are an expert .NET 8 software engineer working on RecipeHub.
Your task is to implement Task 1.2: [Identity] Logout & Session Expiration with UserSession in `RecipeHub.Identity.*`.

### Objectives & DoD:
1. Token Validation & Zero ClockSkew:
   - Configure Access Token lifetime to 15 minutes.
   - In `Program.cs` / `AddRecipeHubAuth`:
     - `ValidateLifetime = true`
     - `ClockSkew = TimeSpan.Zero` (strictly reject expired tokens with 401 without grace period).
2. Refresh Token Rotation & Session Management (`user_session`):
   - Implement `POST /api/v1/identity/auth/refresh` accepting `{ "refreshToken": "..." }`:
     - Compute SHA-256 hash of the incoming refreshToken.
     - Query `identity_db.user_session` where `session_token_hash == computedHash`.
     - Validate:
       a) Session exists.
       b) `revoked_at == null` (session is active).
       c) `expires_at > DateTime.UtcNow` (not expired).
       d) Associated `user_account.state == "active"`.
     - If any condition fails: return `401 Unauthorized` (`"Session has expired or been revoked"`).
     - If valid (Token Rotation):
       a) Mark old session as revoked: `revoked_at = DateTime.UtcNow`.
       b) Generate a new refresh token and compute its SHA-256 hash.
       c) Insert a new session record into `user_session` with `expires_at = DateTime.UtcNow.AddDays(7)`, `last_activity_at = DateTime.UtcNow`.
       d) Issue a new JWT Access Token.
       e) Return `200 OK` with `{ "accessToken": "...", "refreshToken": "...", "expiresIn": 900 }`.
3. Logout Endpoint:
   - Implement `POST /api/v1/identity/auth/logout` accepting `{ "refreshToken": "..." }`:
     - Compute SHA-256 hash, find session in `user_session`.
     - Set `revoked_at = DateTime.UtcNow`.
     - If caller is authenticated with JWT, also revoke all active sessions for that `user_account_id` if requested.
     - Return `200 OK` with `{ "message": "Logged out successfully" }`.
4. Verification:
   - Verify that an expired access token returns 401.
   - Verify that refreshing with a valid token returns new tokens and revokes the previous session hash.
   - Verify that refreshing with a revoked token immediately fails with 401.
```

---

## Task 1.3: [Identity] Role, Permission & Shared Authorization Library (FR-AUTH-02, NFR-SEC-01)

### Complete Task Prompt
```markdown
You are an expert .NET 8 architect working on RecipeHub.
Your task is to implement Task 1.3: Shared Policy/Permission-based Authorization Library in `RecipeHub.BuildingBlocks` so all microservices (`Identity`, `Recipe`, `Content`, `Audit`) share a unified security model.

### Context & Alignment with Identity.dbml:
- Notice: `Identity.dbml` does NOT contain a `permission` table. Permissions are defined as code-level domain constants in `RecipeHub.BuildingBlocks`.
- Roles (`Admin`, `RndStaff`, `Viewer`) are persisted in the database.
- A static `RolePermissionMap` in `BuildingBlocks` maps roles to their respective granular permissions.
- When an access token is issued, permissions are embedded as `permission` claims in the JWT.

### Objectives & DoD:
1. Permission Catalog & Role Mapping (`RecipeHub.BuildingBlocks`):
   - Create static class `Permissions`:
     - Recipes: `Recipes.View`, `Recipes.Create`, `Recipes.Edit`, `Recipes.Approve`
     - Ingredients: `Ingredients.View`, `Ingredients.Manage`
     - Units: `Units.View`, `Units.Manage`
     - Users: `Users.Manage`
     - Audit: `Audit.View`
     - AI: `AI.Manage`, `AI.Execute`
   - Create `RolePermissionMap`:
     - Role `Admin`: Has all permissions.
     - Role `RndStaff`: Has Recipes.*, Ingredients.*, Units.*, AI.*.
     - Role `Viewer`: Has Recipes.View, Ingredients.View, Units.View.
2. Custom Attribute & Policy Handler:
   - Create `[HasPermission(string permission)]` attribute inheriting from `AuthorizeAttribute`.
   - Implement `PermissionAuthorizationRequirement : IAuthorizationRequirement`.
   - Implement `PermissionAuthorizationHandler : AuthorizationHandler<PermissionAuthorizationRequirement>`:
     - Check if user has `ClaimTypes.Role == "Admin"` -> if so, succeed immediately.
     - Check if user has claim `type == "permission"` with matching value.
     - If true, call `context.Succeed(requirement)`. Otherwise, fail (returns 403 Forbidden).
3. ServiceCollection Extension:
   - Create extension method:
     `public static IServiceCollection AddRecipeHubAuth(this IServiceCollection services, IConfiguration configuration)`
   - Configures JWT Bearer authentication:
     - Validates issuer, audience, and signing key from configuration (`Jwt:SecretKey`, `Jwt:Issuer`, `Jwt:Audience`).
     - Sets `ClockSkew = TimeSpan.Zero`.
   - Registers authorization policies dynamically for each permission string in `Permissions`.
   - Registers `PermissionAuthorizationHandler` as `IAuthorizationHandler`.
4. Integration & Documentation:
   - Call `builder.Services.AddRecipeHubAuth(builder.Configuration)` in `RecipeHub.Identity.Api/Program.cs` and `RecipeHub.Recipe.Api/Program.cs`.
   - Protect sample endpoints with `[HasPermission(Permissions.Users.Manage)]` and `[HasPermission(Permissions.Units.View)]`.
   - Write developer guide `RecipeHub/docs/AUTH_GUIDE.md` explaining how to protect endpoints and expected HTTP status codes (401 vs 403).
```

---

## Task 1.4: [Identity] Account Management & Instant Session Revocation (FR-AUTH-04)

### Complete Task Prompt
```markdown
You are an expert .NET 8 software engineer working on RecipeHub.
Your task is to implement Task 1.4: [Identity] Account Management in `RecipeHub.Identity.*`.

### Objectives & DoD:
1. Endpoint Authorization:
   - Protect all User Management endpoints with `[HasPermission(Permissions.Users.Manage)]`.
2. Create User API:
   - Implement `POST /api/v1/identity/users` accepting:
     ```json
     {
       "username": "john_rnd",
       "email": "john@recipehub.local",
       "displayName": "John Doe",
       "password": "SecurePassword123!",
       "roles": ["RndStaff"]
     }
     ```
   - Validation:
     - Validate unique `user_name` (case-insensitive check against `normalized_user_name`).
     - Validate unique `email` (case-insensitive check against `normalized_email`).
     - Ensure at least one valid role is provided.
   - Persistence:
     - Create `UserAccount`: set `public_id = Guid.NewGuid()`, `state = "active"`.
     - Hash password using `IPasswordHasher<UserAccount>` and create `AuthCredential` record linked to `UserAccount.id`.
     - Assign roles in `user_role` setting `assigned_by_user_ref = currentAdminPublicId`.
   - Return `201 Created` with created user details (omitting password hash).
3. List Users API:
   - Implement `GET /api/v1/identity/users`:
     - Query parameters: `search`, `role`, `state`, `pageIndex = 1`, `pageSize = 20`.
     - Return paginated result: `{ "items": [...], "totalCount": 15, "pageIndex": 1, "pageSize": 20, "totalPages": 1 }`.
     - Expose `public_id` as `id` in JSON output.
4. Lock / Deactivate User API (Crucial Security DoD):
   - Implement `PUT /api/v1/identity/users/{publicId}/status` accepting `{ "state": "locked", "reason": "Security lockout" }`.
   - Find `UserAccount` by `public_id`.
   - Update `state = "locked"` and `updated_at = DateTime.UtcNow`.
   - **Crucial Security Requirement**: Query `identity_db.user_session` for all records belonging to this user where `revoked_at == null`, and set `revoked_at = DateTime.UtcNow`.
   - Once locked, any refresh attempt or login attempt by this user must immediately fail with `401 Unauthorized` (`"Account has been locked"`).
5. Verification:
   - Test user creation, pagination, locking, and verify that locked user sessions cannot refresh.
```

---

## Task 1.5: [Recipe/Unit] Unit Catalog & Conversion Engine (FR-UNIT-01 to 06)

### Complete Task Prompt
```markdown
You are an expert .NET 8 engineer working on RecipeHub.
Your task is to implement Task 1.5: Unit Catalog & Conversion Engine in `RecipeHub.Recipe.*`.

### Objectives & DoD:
1. Entity Design & PostgreSQL Configuration (`RecipeHub.Recipe.Domain` & `Infrastructure`):
   - Create `Unit` entity:
     - `Code` (string PK, e.g. "g", "kg", "ml", "l", "cai", "s", "m", "h", "degC")
     - `Name` (string, e.g. "Gram", "Kilogram", "Mililit")
     - `Dimension` (string: "Mass", "Volume", "Count", "Time", "Temperature")
     - `FactorToBase` (`decimal`, conversion factor to the dimension's base unit)
     - `Precision` (`int`, rounding decimal digits, e.g. 2 for g/ml, 0 for count)
     - `IsBaseUnit` (`bool`, true for "g", "ml", "s", "cai", "degC")
     - `IsActive` (`bool`, default true)
     - `IsLocked` (`bool`, default false; set to true once used in recipes/ingredients to prevent factor modification)
     - `CreatedAtUtc` (`DateTime`)
   - Create `RecipeDbContext` in `RecipeHub.Recipe.Infrastructure` and generate EF Core migration for `recipehub_recipe`.
2. Standard Units Seeder:
   - Implement `RecipeDbSeeder` executed on startup to seed standard units:
     - Mass: `g` (Base, factor=1, precision=2), `kg` (factor=1000, precision=3), `mg` (factor=0.001, precision=4)
     - Volume: `ml` (Base, factor=1, precision=2), `l` (factor=1000, precision=3)
     - Count: `cai` (Base, factor=1, precision=0), `qua` (factor=1, precision=0), `tui` (factor=1, precision=0)
     - Time: `s` (Base, factor=1, precision=0), `m` (factor=60, precision=1), `h` (factor=3600, precision=2)
     - Temperature: `degC` (Base, factor=1, precision=1)
3. Unit Conversion Service:
   - Implement `IUnitConversionService` in `RecipeHub.Recipe.Application`:
     `decimal Convert(decimal value, string sourceUnitCode, string targetUnitCode)`
   - Formula:
     $$\text{TargetValue} = \frac{\text{value} \times \text{sourceUnit.FactorToBase}}{\text{targetUnit.FactorToBase}}$$
   - **Dimension Guard**: If `sourceUnit.Dimension != targetUnit.Dimension`, throw `InvalidOperationException` / return `400 Bad Request` ("Cannot convert across dimensions: Mass vs Volume").
   - **Precision & Rounding**: Use `decimal.Round(result, targetUnit.Precision, MidpointRounding.AwayFromZero)`. Absolutely no floating-point types (`float`, `double`).
4. CRUD APIs (`RecipeHub.Recipe.Api`):
   - `GET /api/v1/recipes/units`: List all units (filter by `dimension`, `isActive`).
   - `GET /api/v1/recipes/units/{code}`: Get single unit.
   - `POST /api/v1/recipes/units`: Create new custom unit (protected by `[HasPermission(Permissions.Units.Manage)]`).
   - `PUT /api/v1/recipes/units/{code}`: Update unit. **Rule FR-UNIT-05**: If `IsLocked == true` or unit is referenced, reject changing `FactorToBase` or `Dimension` (return 400 with explanation).
   - `POST /api/v1/recipes/units/convert`: Test conversion endpoint accepting `{ "value": 1.5, "sourceUnit": "kg", "targetUnit": "g" }` -> returns `{ "result": 1500.0, "targetUnit": "g" }`.
5. Unit Tests:
   - Write unit tests in `tests/RecipeHub.Recipe.Tests`:
     - `1 kg -> 1000 g`
     - `1.5 l -> 1500 ml`
     - `g -> ml` fails with dimension mismatch exception
     - Midpoint rounding behavior verification.
```

---

## Task 1.6: [Recipe/Ingredient] Ingredient Repository & Soft-Delete (FR-ING-01 to 06)

### Complete Task Prompt
```markdown
You are an expert .NET 8 engineer working on RecipeHub.
Your task is to implement Task 1.6: Ingredient Repository & Soft-Delete in `RecipeHub.Recipe.*`.

### Objectives & DoD:
1. Entity Design (`RecipeHub.Recipe.Domain`):
   - Create `Ingredient` entity:
     - `Id` (Guid PK)
     - `Code` (string, unique, indexed, e.g. "ING-CF-ROB", "ING-MILK-COND")
     - `Name` (string, e.g. "Roasted Robusta Coffee", "Star Condensed Milk")
     - `Category` (string, e.g. "Coffee", "Tea", "Milk", "Syrup", "Topping")
     - `DefaultUnitCode` (string FK to `Units.Code`)
     - `Description` (string?)
     - `StorageInstructions` (string?, e.g. "Store in a cool dry place, 20-25°C")
     - `AllergensOrWarnings` (string?, e.g. "Contains milk and soy")
     - `Status` (enum `IngredientStatus`: `Active`, `Discontinued`)
     - `IsActive` (bool, default true)
     - `CreatedAtUtc`, `UpdatedAtUtc`
     - `CreatedBy` (Guid public_id of the user who created it)
   - Configure EF Core Fluent API in `RecipeDbContext` and create migration.
2. CRUD APIs with Filtering & Pagination:
   - `GET /api/v1/recipes/ingredients`:
     - Parameters: `search` (matches Code or Name), `category`, `status` (Active / Discontinued), `pageIndex = 1`, `pageSize = 20`.
     - Returns: `{ "items": [...], "totalCount": 45, "pageIndex": 1, "pageSize": 20, "totalPages": 3 }`.
   - `GET /api/v1/recipes/ingredients/{id}`: Returns ingredient details with default unit metadata.
   - `POST /api/v1/recipes/ingredients`: Validate code uniqueness and that `DefaultUnitCode` exists. Return `201 Created`.
   - `PUT /api/v1/recipes/ingredients/{id}`: Update metadata.
3. Soft-Delete Logic (FR-ING-04, 05):
   - `DELETE /api/v1/recipes/ingredients/{id}`:
     - Check if ingredient is referenced in any recipe version.
     - Never hard-delete if referenced. Instead, perform Soft-Delete: set `Status = IngredientStatus.Discontinued` and `IsActive = false`.
     - Return `200 OK` with message: "Ingredient has been discontinued to preserve recipe history."
   - In candidate selection queries for new recipe creation, filter out `Discontinued` ingredients. Existing recipe versions retain access to historical ingredient data.
```

---

## Task 1.7: [Recipe/Calc] Recipe Yield Scaling & Dimension-based Totals (FR-REC-04, 05; UC-02)

### Complete Task Prompt
```markdown
You are an expert .NET 8 engineer working on RecipeHub.
Your task is to implement Task 1.7: Yield Scaling & Aggregation Calculations in `RecipeHub.Recipe.*`.

### Objectives & DoD:
1. Domain Service (`RecipeHub.Recipe.Domain`):
   - Create `IRecipeCalculationService`:
     - `IEnumerable<ScaledIngredientDto> ScaleRecipe(IEnumerable<RecipeIngredientDto> ingredients, decimal standardYield, decimal targetYield)`
     - `DimensionTotalsSummaryDto CalculateTotals(IEnumerable<RecipeIngredientDto> ingredients, IUnitConversionService unitService)`
2. Scaling Logic (FR-REC-04):
   - Scaling ratio:
     $$R = \frac{\text{targetYield}}{\text{standardYield}}$$
   - For each ingredient:
     $$\text{scaledQuantity} = \text{decimal.Round}(\text{originalQuantity} \times R, \text{unit.Precision}, \text{MidpointRounding.AwayFromZero})$$
   - Guard against invalid yields (`targetYield <= 0` or `standardYield <= 0`).
3. Dimension-based Totals Aggregation (FR-REC-05):
   - Group ingredients by `Unit.Dimension` (Mass, Volume, Count, etc.).
   - For each dimension, convert all ingredient quantities to the dimension's **Base Unit** (e.g. all mass items converted to `g`, all volume items converted to `ml`).
   - Sum the base quantities.
   - **Crucial Rule**: Reject summing across different dimensions (e.g. `g + ml` cannot be summed into a single number). Return totals broken down strictly per dimension:
     ```json
     {
       "totals": [
         { "dimension": "Mass", "totalBaseQuantity": 450.0, "baseUnit": "g" },
         { "dimension": "Volume", "totalBaseQuantity": 320.0, "baseUnit": "ml" }
       ]
     }
     ```
4. Calculation Preview APIs:
   - `POST /api/v1/recipes/calculate/scale`: Accepts ingredients list, standard yield, target yield -> returns scaled list.
   - `POST /api/v1/recipes/calculate/totals`: Accepts ingredients list -> returns grouped totals per dimension.
5. Unit Tests:
   - Write comprehensive unit tests in `tests/RecipeHub.Recipe.Tests`:
     - Test 1x, 2.5x, 5x, 0.33x scaling.
     - Test rounding precision (no precision loss, check decimal places).
     - Test dimension grouping with mixed mass & volume items.
```

---

## Task 1.8: [Recipe/Snapshot] Ingredient Snapshot & Drift Detection (FR-SNAP-02, 04)

### Complete Task Prompt
```markdown
You are an expert .NET 8 engineer working on RecipeHub.
Your task is to implement Task 1.8: Ingredient Snapshot & Drift Detection in `RecipeHub.Recipe.*`.

### Objectives & DoD:
1. Snapshot Storage in Recipe Entities:
   - In `RecipeHub.Recipe.Domain`, create/update `RecipeIngredient` entity:
     - `Id` (Guid PK)
     - `RecipeVersionId` (Guid FK to `RecipeVersion`)
     - `IngredientId` (Guid FK to `Ingredient`)
     - `UnitCode` (string FK to `Unit`)
     - `Quantity` (`decimal`)
     - `StepOrder` (`int`)
     - `Stage` (`string?`)
     - `Notes` (`string?`)
     - **Snapshot Columns**:
       - `SnapshotIngredientCode` (`string`)
       - `SnapshotIngredientName` (`string`)
       - `SnapshotCategory` (`string`)
       - `SnapshotUnitCode` (`string`)
   - When ingredients are added to a recipe version or approved, copy the current master ingredient attributes into these snapshot columns.
2. Approved Version Immutability (FR-VER-02):
   - If `RecipeVersion.Status == Approved`, all modifications are blocked at API and database level. The snapshot fields remain completely frozen.
3. Drift Detection Logic (FR-SNAP-02, 04):
   - Implement `IIngredientDriftDetector` in Application layer:
     - When fetching a recipe version (`GET /api/v1/recipes/{id}/versions/{versionId}`), query current master records from `Ingredients` table for all `IngredientId`s present in the recipe.
     - Compare `SnapshotIngredientName` vs `Master.Name`, `SnapshotIngredientCode` vs `Master.Code`, `SnapshotCategory` vs `Master.Category`, etc.
     - If any attribute has changed, populate a `DriftWarning` badge model:
       ```json
       {
         "ingredientId": "b1b72e92-5717-4562-b3fc-2c963f66afa6",
         "hasDrift": true,
         "snapshot": { "code": "ING-MILK-01", "name": "Star Condensed Milk" },
         "currentMaster": { "code": "ING-MILK-01", "name": "Southern Condensed Milk" },
         "diffs": [
           {
             "field": "Name",
             "snapshotValue": "Star Condensed Milk",
             "currentMasterValue": "Southern Condensed Milk"
           }
         ]
       }
       ```
   - Ensure the recipe text itself continues displaying the frozen snapshot name, while the UI displays the warning badge.
4. Verification:
   - Create a recipe with ingredient "Star Condensed Milk" and approve it.
   - Update master ingredient name in warehouse to "Southern Condensed Milk".
   - Fetch the approved recipe: verify that recipe ingredient still shows "Star Condensed Milk", `hasDrift == true`, and diff accurately reports the change.
```

