using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using RecipeHub.BuildingBlocks.Ai;
using RecipeHub.BuildingBlocks.Events;
using RecipeHub.Recipe.Application;
using RecipeHub.Recipe.Application.DTOs;
using RecipeHub.Recipe.Application.Interfaces;
using RecipeHub.Recipe.Infrastructure.Data;
using StackExchange.Redis;

namespace RecipeHub.Recipe.Infrastructure.Repositories;

public sealed class AiDraftRepository(RecipeDbContext db, IServiceProvider services, IConfiguration configuration) : IAiDraftRepository
{
    private static readonly JsonSerializerOptions DraftJsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<(AiDraftCatalogIngredient[] Ingredients, AiDraftCatalogUnit[] Units)> GetCatalogAsync(CancellationToken cancellationToken)
    {
        if (GeminiKeyRotation.GetKeys(configuration).Length == 0)
            throw new AiDraftUnavailableException();

        var ingredients = await db.Ingredients.AsNoTracking().Where(x => x.State == "active")
            .Select(x => new AiDraftCatalogIngredient(x.PublicId, x.Code, x.Name, x.Category.Name, x.Description, x.State)).ToArrayAsync(cancellationToken);
        var units = await db.Units.AsNoTracking().Where(x => x.State == "active")
            .Select(x => new AiDraftCatalogUnit(x.PublicId, x.Code, x.Name, x.State)).ToArrayAsync(cancellationToken);
        return (ingredients, units);
    }

    public async Task EnqueueAsync(AiDraftRequestedEvent request, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var key = (RedisKey)$"recipe:ai-draft:{request.JobId:D}";
        var envelope = new EventEnvelope<AiDraftStreamPayload> { Source = "Recipe.Api", Payload = new(request.JobId) };
        var transaction = GetDatabase().CreateTransaction();
        transaction.AddCondition(Condition.KeyNotExists(key));
        var hash = transaction.HashSetAsync(key, [
            new HashEntry("ownerId", request.OwnerId.ToString("D")),
            new HashEntry("status", "pending"),
            new HashEntry("request", JsonSerializer.Serialize(request.Request, DraftJsonOptions))]);
        var expiry = transaction.KeyExpireAsync(key, TimeSpan.FromMinutes(30));
        var stream = transaction.StreamAddAsync("recipe.ai-drafts.v1", [new NameValueEntry("payload", envelope.ToJson())]);
        if (!await transaction.ExecuteAsync())
            throw new AiDraftUnavailableException();
        await Task.WhenAll(hash, expiry, stream);
    }

    public async Task<AiDraftStoredJob?> GetAsync(Guid jobId, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var fields = await GetDatabase().HashGetAsync($"recipe:ai-draft:{jobId:D}", ["ownerId", "status", "outcome", "draft", "cannotGenerate", "errorMessage"]);
        if (!Guid.TryParse(fields[0].ToString(), out var ownerId) || fields[1].IsNullOrEmpty)
            return null;
        var draft = fields[3].IsNullOrEmpty ? null : JsonSerializer.Deserialize<AiRecipeDraft>(fields[3].ToString(), DraftJsonOptions);
        var cannotGenerate = fields[4].IsNullOrEmpty ? null : JsonSerializer.Deserialize<AiDraftCannotGenerate>(fields[4].ToString(), DraftJsonOptions);
        return new AiDraftStoredJob(ownerId, new AiDraftResponse(
            fields[1].ToString(), fields[2].IsNullOrEmpty ? null : fields[2].ToString(), draft, cannotGenerate,
            fields[5].IsNullOrEmpty ? null : fields[5].ToString()));
    }

    private IDatabase GetDatabase() => (services.GetService<IConnectionMultiplexer>()
        ?? throw new AiDraftUnavailableException()).GetDatabase();
}
