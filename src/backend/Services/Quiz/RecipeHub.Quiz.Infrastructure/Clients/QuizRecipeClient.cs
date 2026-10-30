using Grpc.Core;
using RecipeHub.GrpcContracts.Recipe;
using RecipeHub.Quiz.Application.Interfaces;

namespace RecipeHub.Quiz.Infrastructure.Clients;

public class QuizRecipeClient : IQuizRecipeClient
{
    private readonly QuizRecipeQuery.QuizRecipeQueryClient _client;

    public QuizRecipeClient(QuizRecipeQuery.QuizRecipeQueryClient client)
    {
        _client = client;
    }

    public async Task<Dictionary<Guid, QuizRecipeMetadata>> GetRecipeVersionsAsync(
        IEnumerable<Guid> versionIds,
        string bearerToken,
        CancellationToken cancellationToken = default)
    {
        var idList = versionIds.Distinct().ToList();
        if (idList.Count == 0)
        {
            return new Dictionary<Guid, QuizRecipeMetadata>();
        }
        if (idList.Count > 100)
        {
            throw new ArgumentException("Recipe version query batch cannot exceed 100 IDs.");
        }

        var request = new GetQuizRecipeVersionsRequest();
        foreach (var id in idList)
        {
            request.RecipeVersionIds.Add(id.ToString());
        }

        var metadata = new Metadata();
        if (!string.IsNullOrWhiteSpace(bearerToken))
        {
            var headerValue = bearerToken.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                ? bearerToken
                : $"Bearer {bearerToken}";
            metadata.Add("authorization", headerValue);
        }

        try
        {
            var response = await _client.GetQuizRecipeVersionsAsync(
                request,
                headers: metadata,
                deadline: DateTime.UtcNow.AddSeconds(5),
                cancellationToken: cancellationToken);

            if (!response.IsSuccess)
            {
                throw new RecipeHub.Quiz.Application.Exceptions.QuizDependencyException($"Recipe service returned error: {response.ErrorMessage}");
            }

            var result = new Dictionary<Guid, QuizRecipeMetadata>();
            foreach (var item in response.Items)
            {
                if (Guid.TryParse(item.RecipeVersionId, out var vId))
                {
                    Guid.TryParse(item.RecipeId, out var rId);
                    result[vId] = new QuizRecipeMetadata(
                        RecipeVersionId: vId,
                        RecipeId: rId,
                        Title: item.Title,
                        Status: item.Status,
                        IsEligible: item.IsEligible
                    );
                }
            }

            return result;
        }
        catch (RpcException ex)
        {
            throw new RecipeHub.Quiz.Application.Exceptions.QuizDependencyException($"Failed to communicate with Recipe service via gRPC: {ex.Status.Detail ?? ex.Message}", ex);
        }
    }
}
