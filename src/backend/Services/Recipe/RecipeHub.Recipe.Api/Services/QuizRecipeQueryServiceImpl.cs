using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using RecipeHub.GrpcContracts.Identity;
using RecipeHub.GrpcContracts.Recipe;
using RecipeHub.Recipe.Infrastructure.Data;

namespace RecipeHub.Recipe.Api.Services;

public sealed class QuizRecipeQueryServiceImpl : QuizRecipeQuery.QuizRecipeQueryBase
{
    private readonly RecipeDbContext _dbContext;
    private readonly IdentitySession.IdentitySessionClient _identityClient;
    private readonly ILogger<QuizRecipeQueryServiceImpl> _logger;

    public QuizRecipeQueryServiceImpl(
        RecipeDbContext dbContext,
        IdentitySession.IdentitySessionClient identityClient,
        ILogger<QuizRecipeQueryServiceImpl> logger)
    {
        _dbContext = dbContext;
        _identityClient = identityClient;
        _logger = logger;
    }

    public override async Task<GetQuizRecipeVersionsResponse> GetQuizRecipeVersions(
        GetQuizRecipeVersionsRequest request,
        ServerCallContext context)
    {
        // 1. Authenticate caller from gRPC metadata "authorization" header
        var authHeader = context.RequestHeaders.GetValue("authorization");
        if (string.IsNullOrWhiteSpace(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("QuizRecipeQuery rejected: missing or malformed authorization header.");
            return new GetQuizRecipeVersionsResponse
            {
                IsSuccess = false,
                ErrorMessage = "Missing or malformed Authorization bearer token."
            };
        }

        var token = authHeader["Bearer ".Length..].Trim();
        string actorRole;
        try
        {
            var validateResponse = await _identityClient.ValidateAsync(
                new ValidateSessionRequest { AccessToken = token },
                deadline: DateTime.UtcNow.AddSeconds(5),
                cancellationToken: context.CancellationToken);

            if (!validateResponse.Valid)
            {
                _logger.LogWarning("QuizRecipeQuery rejected: invalid session token.");
                return new GetQuizRecipeVersionsResponse
                {
                    IsSuccess = false,
                    ErrorMessage = "Session token is invalid or expired."
                };
            }

            actorRole = validateResponse.Role.ToLowerInvariant();
        }
        catch (RpcException ex)
        {
            _logger.LogError(ex, "Failed to validate session token via IdentitySession.");
            return new GetQuizRecipeVersionsResponse
            {
                IsSuccess = false,
                ErrorMessage = "Identity validation service unavailable."
            };
        }

        // Allowed roles: admin, rnd, viewer
        if (actorRole != "admin" && actorRole != "rnd" && actorRole != "viewer")
        {
            _logger.LogWarning("QuizRecipeQuery rejected: role '{Role}' unauthorized.", actorRole);
            return new GetQuizRecipeVersionsResponse
            {
                IsSuccess = false,
                ErrorMessage = $"Role '{actorRole}' is not authorized to query recipe versions for quiz."
            };
        }

        // 2. Parse version UUIDs (max 100)
        var requestedIds = request.RecipeVersionIds.Distinct().Take(100).ToList();
        var validGuids = new List<Guid>();
        foreach (var idStr in requestedIds)
        {
            if (Guid.TryParse(idStr, out var g))
            {
                validGuids.Add(g);
            }
        }

        if (validGuids.Count == 0)
        {
            return new GetQuizRecipeVersionsResponse
            {
                IsSuccess = true,
                Items = { }
            };
        }

        // 3. Query versions from Recipe database
        var versions = await _dbContext.RecipeVersions
            .AsNoTracking()
            .Include(v => v.Recipe)
            .Where(v => validGuids.Contains(v.PublicId))
            .ToListAsync(context.CancellationToken);

        var versionMap = versions.ToDictionary(v => v.PublicId);
        var response = new GetQuizRecipeVersionsResponse { IsSuccess = true };

        foreach (var requestedGuid in validGuids)
        {
            if (versionMap.TryGetValue(requestedGuid, out var version))
            {
                var isPublished = string.Equals(version.Status, "published", StringComparison.OrdinalIgnoreCase);
                var isNotArchived = !version.Recipe.ArchivedAt.HasValue;
                var isEligible = isPublished && isNotArchived;

                if (actorRole == "viewer" && !isEligible)
                {
                    // Viewer: do not leak draft/archived recipe metadata
                    response.Items.Add(new QuizRecipeVersionItemDto
                    {
                        RecipeVersionId = requestedGuid.ToString(),
                        RecipeId = "",
                        Title = "",
                        Status = "unavailable",
                        IsEligible = false
                    });
                }
                else
                {
                    response.Items.Add(new QuizRecipeVersionItemDto
                    {
                        RecipeVersionId = version.PublicId.ToString(),
                        RecipeId = version.Recipe.PublicId.ToString(),
                        Title = version.Name,
                        Status = version.Status,
                        IsEligible = isEligible
                    });
                }
            }
            else
            {
                response.Items.Add(new QuizRecipeVersionItemDto
                {
                    RecipeVersionId = requestedGuid.ToString(),
                    RecipeId = "",
                    Title = "",
                    Status = "not_found",
                    IsEligible = false
                });
            }
        }

        return response;
    }
}
