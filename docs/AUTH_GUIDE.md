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
