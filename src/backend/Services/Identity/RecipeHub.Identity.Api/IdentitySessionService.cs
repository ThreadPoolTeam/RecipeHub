using Grpc.Core;
using RecipeHub.GrpcContracts.Identity;
using RecipeHub.Identity.Application.Interfaces;

namespace RecipeHub.Identity.Api;

public sealed class IdentitySessionService(IAuthService auth) : IdentitySession.IdentitySessionBase
{
    public override async Task<ValidateSessionResponse> Validate(ValidateSessionRequest request, ServerCallContext context)
    {
        var session = await auth.ValidateAsync(request.AccessToken, context.CancellationToken);
        if (session is null) return new ValidateSessionResponse { Valid = false };
        return new ValidateSessionResponse
        {
            Valid = true,
            UserId = session.User.Id.ToString(),
            Role = session.User.Role,
            DisplayName = session.User.FullName
        };
    }
}
