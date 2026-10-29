namespace RecipeHub.Identity.Application.DTOs;

public sealed record LoginRequest(string? Username, string? Password);
public sealed record RefreshRequest(string? RefreshToken);
public sealed record LoginResponse(string AccessToken, string RefreshToken, DateTime ExpiresAt, UserResponse User);
public sealed record ValidatedSession(Guid SessionId, UserResponse User);
