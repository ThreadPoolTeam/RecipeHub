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
            var response = await identity.ValidateAsync(new ValidateSessionRequest { AccessToken = header[7..].Trim() },
                deadline: DateTime.UtcNow.AddSeconds(5), cancellationToken: Context.RequestAborted);
            if (!response.Valid) return AuthenticateResult.Fail("Session đã hết hạn hoặc bị thu hồi.");
            var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, response.UserId), new(ClaimTypes.Role, response.Role) };
            claims.AddRange(response.AllowedRecipeIds.Select(id => new Claim("allowed_recipe_id", id)));
            return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(new ClaimsIdentity(claims, Scheme.Name)), Scheme.Name));
        }
        catch (RpcException error)
        {
            Logger.LogWarning("Identity session validation unavailable: {Status}", error.StatusCode);
            return AuthenticateResult.Fail("Không thể xác thực session Identity.");
        }
    }
}
