namespace RecipeHub.Identity.Application.DTOs;

public sealed record UserResponse(Guid Id, string Email, string FullName, string Role, bool IsActive, DateTime CreatedAt);
public sealed record UserPage(IReadOnlyList<UserResponse> Items, int TotalCount, int Page, int PageSize);
public sealed record CreateUserRequest(string? Email, string? FullName, string? Role, string? Password);
public sealed record UpdateUserRequest(string? FullName, string? Role);
public sealed record UserStatusRequest(bool IsActive);
public sealed record ChangePasswordRequest(string? CurrentPassword, string? NewPassword);
public sealed record ResetPasswordRequest(string? NewPassword);
