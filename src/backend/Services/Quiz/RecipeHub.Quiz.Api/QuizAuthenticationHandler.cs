using System.Security.Claims;
using System.Text.Encodings.Web;
using Grpc.Core;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using RecipeHub.GrpcContracts.Identity;

namespace RecipeHub.Quiz.Api;

public sealed class QuizAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IdentitySession.IdentitySessionClient identity)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Path.StartsWithSegments("/api/v1/quiz"))
        {
            return AuthenticateResult.NoResult();
        }

        // Allow anonymous access to info endpoint
        if (Request.Path == "/api/v1/quiz/info")
        {
            return AuthenticateResult.NoResult();
        }

        var header = Request.Headers.Authorization.ToString();
        if (!header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return AuthenticateResult.NoResult();
        }

        try
        {
            var token = header["Bearer ".Length..].Trim();
            var response = await identity.ValidateAsync(
                new ValidateSessionRequest { AccessToken = token },
                deadline: DateTime.UtcNow.AddSeconds(5),
                cancellationToken: Context.RequestAborted);

            if (!response.Valid)
            {
                return AuthenticateResult.Fail("Session has expired or was revoked.");
            }

            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, response.UserId),
                new(ClaimTypes.Role, response.Role.ToLowerInvariant())
            };

            var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, Scheme.Name));
            return AuthenticateResult.Success(new AuthenticationTicket(principal, Scheme.Name));
        }
        catch (RpcException ex)
        {
            Logger.LogWarning("Identity session validation unavailable: {Status}", ex.StatusCode);
            return AuthenticateResult.Fail("Identity session validation service is unavailable.");
        }
    }
}
