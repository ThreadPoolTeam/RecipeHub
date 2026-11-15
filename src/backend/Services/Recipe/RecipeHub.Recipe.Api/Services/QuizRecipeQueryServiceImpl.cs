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
        var (actorRole, authError) = await AuthenticateAsync(context);
        if (authError is not null)
            return new GetQuizRecipeVersionsResponse { ErrorMessage = authError };

        // Allowed roles: rnd, viewer
        if (actorRole != "rnd" && actorRole != "viewer")
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

    public override async Task<GetQuizRecipeContentResponse> GetQuizRecipeContent(
        GetQuizRecipeContentRequest request, ServerCallContext context)
    {
        var (actorRole, authError) = await AuthenticateAsync(context);
        if (authError is not null)
            return new GetQuizRecipeContentResponse { ErrorMessage = authError };
        if (actorRole != "rnd")
            return new GetQuizRecipeContentResponse { ErrorMessage = "Only R&D can query recipe content for quiz." };
        if (!Guid.TryParse(request.RecipeVersionId, out var versionId))
            return new GetQuizRecipeContentResponse { ErrorMessage = "Invalid recipe version ID." };

        var version = await _dbContext.RecipeVersions.AsNoTracking()
            .Include(v => v.Recipe)
            .Include(v => v.RecipeIngredients).ThenInclude(i => i.Unit)
            .Include(v => v.RecipeSteps)
            .AsSplitQuery()
            .SingleOrDefaultAsync(v => v.PublicId == versionId, context.CancellationToken);
        if (version is null || !string.Equals(version.Status, "published", StringComparison.OrdinalIgnoreCase)
            || version.Recipe.ArchivedAt.HasValue)
            return new GetQuizRecipeContentResponse { ErrorMessage = "Recipe version not found, not published, or archived." };

        var response = new GetQuizRecipeContentResponse
        {
            IsSuccess = true,
            RecipeVersionId = version.PublicId.ToString(),
            Title = version.Name,
            Description = version.Description ?? ""
        };
        response.Ingredients.AddRange(version.RecipeIngredients.OrderBy(i => i.SortOrder).Select(i =>
            new QuizRecipeIngredientDto
            {
                Name = i.IngredientNameSnapshot, Quantity = (double)i.Quantity, UnitName = i.Unit.Name,
                StageName = i.StageName ?? "", Note = i.Note ?? ""
            }));
        foreach (var step in version.RecipeSteps.OrderBy(s => s.SortOrder))
        {
            var item = new QuizRecipeStepDto
            {
                SortOrder = step.SortOrder, Title = step.Title, Description = step.Description,
                Equipment = step.Equipment ?? "", CompletionCriteria = step.CompletionCriteria ?? "",
                SafetyNote = step.SafetyNote ?? ""
            };
            if (step.DurationSeconds.HasValue) item.DurationSeconds = step.DurationSeconds.Value;
            if (step.TemperatureCelsius.HasValue) item.TemperatureCelsius = (double)step.TemperatureCelsius.Value;
            response.Steps.Add(item);
        }
        return response;
    }

    private async Task<(string? Role, string? Error)> AuthenticateAsync(ServerCallContext context)
    {
        var authHeader = context.RequestHeaders.GetValue("authorization");
        if (string.IsNullOrWhiteSpace(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("QuizRecipeQuery rejected: missing or malformed authorization header.");
            return (null, "Missing or malformed Authorization bearer token.");
        }
        try
        {
            var result = await _identityClient.ValidateAsync(
                new ValidateSessionRequest { AccessToken = authHeader["Bearer ".Length..].Trim() },
                deadline: DateTime.UtcNow.AddSeconds(5), cancellationToken: context.CancellationToken);
            if (!result.Valid)
            {
                _logger.LogWarning("QuizRecipeQuery rejected: invalid session token.");
                return (null, "Session token is invalid or expired.");
            }
            return (result.Role.ToLowerInvariant(), null);
        }
        catch (RpcException ex)
        {
            _logger.LogError(ex, "Failed to validate session token via IdentitySession.");
            return (null, "Identity validation service unavailable.");
        }
    }
}
