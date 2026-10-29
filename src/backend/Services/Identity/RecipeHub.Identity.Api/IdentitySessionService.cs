using Grpc.Core;
using RecipeHub.GrpcContracts.Identity;
using RecipeHub.Identity.Application;

namespace RecipeHub.Identity.Api;

public sealed class IdentitySessionService(IdentityService identity) : IdentitySession.IdentitySessionBase
{
    public override async Task<ValidateSessionResponse> Validate(ValidateSessionRequest request, ServerCallContext context)
    {
        var session = await identity.ValidateAsync(request.AccessToken, context.CancellationToken);
        if (session is null) return new ValidateSessionResponse { Valid = false };
        return new ValidateSessionResponse { Valid = true, UserId = session.User.Id.ToString(), Role = session.User.Role };
    }
}
