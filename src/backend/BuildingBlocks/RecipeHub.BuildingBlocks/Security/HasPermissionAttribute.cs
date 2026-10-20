using Microsoft.AspNetCore.Authorization;

namespace RecipeHub.BuildingBlocks.Security;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true, Inherited = true)]
public sealed class HasPermissionAttribute(string permission) : AuthorizeAttribute(permission);
