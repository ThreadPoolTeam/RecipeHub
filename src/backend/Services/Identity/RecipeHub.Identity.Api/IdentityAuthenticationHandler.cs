using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using RecipeHub.Identity.Application.Interfaces;

namespace RecipeHub.Identity.Api;

public sealed class IdentityAuthenticationHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger,
    UrlEncoder encoder, IAuthService auth) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var header = Request.Headers.Authorization.ToString();
        if (!header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)) return AuthenticateResult.NoResult();
        var session = await auth.ValidateAsync(header[7..].Trim(), Context.RequestAborted);
        if (session is null) return AuthenticateResult.Fail("Session đã hết hạn hoặc bị thu hồi.");
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, session.User.Id.ToString()), new Claim(ClaimTypes.Role, session.User.Role),
            new Claim("session_id", session.SessionId.ToString()) };
        return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(new ClaimsIdentity(claims, Scheme.Name)), Scheme.Name));
    }
}
