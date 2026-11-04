using System.Security.Claims;
using System.Text.Encodings.Web;
using Grpc.Core;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using RecipeHub.GrpcContracts.Identity;

namespace RecipeHub.Recipe.Api;

public sealed class RecipeAuthenticationHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger,
    UrlEncoder encoder, IdentitySession.IdentitySessionClient identity) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Path.StartsWithSegments("/api/v1/recipes")) return AuthenticateResult.NoResult();
        var header = Request.Headers.Authorization.ToString();
        if (!header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)) return AuthenticateResult.NoResult();
        try
        {
            Logger.LogInformation("RecipeAuth: Validating token with Identity gRPC at path {Path}...", Request.Path);
            var response = await identity.ValidateAsync(new ValidateSessionRequest { AccessToken = header[7..].Trim() },
                deadline: DateTime.UtcNow.AddSeconds(5), cancellationToken: Context.RequestAborted);
            Logger.LogInformation("RecipeAuth: Identity gRPC response: Valid={Valid}, UserId={UserId}, Role={Role}", response.Valid, response.UserId, response.Role);
            if (!response.Valid) return AuthenticateResult.Fail("Session đã hết hạn hoặc bị thu hồi.");
            var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, response.UserId), new(ClaimTypes.Role, response.Role) };
            if (!string.IsNullOrWhiteSpace(response.DisplayName))
            {
                claims.Add(new Claim(ClaimTypes.Name, response.DisplayName));
            }
            return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(new ClaimsIdentity(claims, Scheme.Name)), Scheme.Name));
        }
        catch (RpcException error)
        {
            Logger.LogWarning(error, "Identity session validation RpcException: {Status} - {Detail} | Inner: {Inner}", error.StatusCode, error.Status.Detail, error.InnerException?.Message);
            return AuthenticateResult.Fail("Không thể xác thực session Identity.");
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Identity session validation unexpected exception: {Type} - {Message}", ex.GetType().Name, ex.Message);
            return AuthenticateResult.Fail("Lỗi nội bộ khi xác thực.");
        }
    }
}
