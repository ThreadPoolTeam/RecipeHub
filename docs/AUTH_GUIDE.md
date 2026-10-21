# RecipeHub authorization guide

Register shared JWT authentication in each API:

```csharp
builder.Services.AddRecipeHubAuth(builder.Configuration);
app.UseAuthentication();
app.UseAuthorization();
```

Protect endpoints with a code-level permission:

```csharp
[HasPermission(Permissions.Units.Manage)]
public Task<IResult> CreateUnit(...) { ... }
```

For minimal APIs use `.RequireAuthorization(Permissions.Units.Manage)`.

- `401 Unauthorized`: the bearer token is absent, invalid, or expired.
- `403 Forbidden`: the token is valid but lacks the required permission.
- Permissions are JWT `permission` claims derived from persisted roles. `Admin` bypasses individual permission checks.

## Recipe startup after merging dev

Recipe API keeps the controller-based startup from `dev`, with shared JWT registration and authentication/authorization middleware before endpoint mapping. It does not map the parallel `RecipeEndpoints` minimal APIs or run their Recipe migrations/seeder at startup.

Keep `Jwt:SecretKey`, `Jwt:Issuer`, and `Jwt:Audience` aligned with Identity. Middleware registration alone does not require authentication on controllers: endpoint permission attributes and the existing `X-User-Id` actor handling remain unchanged by this startup-only resolution.
