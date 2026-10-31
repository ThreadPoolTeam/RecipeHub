using System.Security.Claims;
using System.Text.Encodings.Web;
using Grpc.Core;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using RecipeHub.Content.Application.Exceptions;
using RecipeHub.GrpcContracts.Identity;

namespace RecipeHub.Content.Api;

public sealed class ContentAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IdentitySession.IdentitySessionClient identityClient)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Path.StartsWithSegments("/api/v1/content"))
        {
            return AuthenticateResult.NoResult();
        }

        var header = Request.Headers.Authorization.ToString();
        if (!header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return AuthenticateResult.NoResult();
        }

        var token = header["Bearer ".Length..].Trim();
        if (string.IsNullOrWhiteSpace(token))
        {
            return AuthenticateResult.Fail("Bearer token is empty.");
        }

        try
        {
            var response = await identityClient.ValidateAsync(
                new ValidateSessionRequest { AccessToken = token },
                deadline: DateTime.UtcNow.AddSeconds(5),
                cancellationToken: Context.RequestAborted);

            if (!response.Valid)
            {
                return AuthenticateResult.Fail("Session has expired or was revoked.");
            }

            if (!Guid.TryParse(response.UserId, out var userId) || userId == Guid.Empty)
            {
                return AuthenticateResult.Fail("Invalid user identifier in session.");
            }

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, response.UserId),
                new Claim(ClaimTypes.Role, response.Role.ToLowerInvariant())
            };

            var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, Scheme.Name));
            return AuthenticateResult.Success(new AuthenticationTicket(principal, Scheme.Name));
        }
        catch (RpcException ex)
        {
            Logger.LogWarning("Identity session validation unavailable: {Status}", ex.StatusCode);
            throw new ContentDependencyException("Identity session validation service is unavailable.", ex);
        }
        catch (Exception ex) when (ex is not ContentDependencyException)
        {
            Logger.LogError(ex, "Unexpected error during session validation.");
            throw new ContentDependencyException("Identity session validation service encountered an unexpected error.", ex);
        }
    }
}
