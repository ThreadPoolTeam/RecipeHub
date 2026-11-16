using RecipeHub.Recipe.Application;
using RecipeHub.Recipe.Application.DTOs;
using RecipeHub.Recipe.Application.Interfaces;
using RecipeHub.Recipe.Application.Services;
using Xunit;

namespace RecipeHub.UnitTests;

public class AiDraftServiceTests
{
    [Theory]
    [InlineData("", null)]
    [InlineData("   ", null)]
    [InlineData("Món", 1001)]
    public async Task CreateRejectsInvalidInput(string name, int? descriptionLength)
    {
        var service = new AiDraftService(new FakeRepository());
        await Assert.ThrowsAsync<ValidationException>(() => service.CreateAsync(
            new CreateAiDraftRequest(name, descriptionLength is null ? null : new string('x', descriptionLength.Value)), Guid.NewGuid(), default));
    }

    [Fact]
    public async Task CreateStoresTrimmedNameAndDescriptionInSnapshot()
    {
        var repository = new FakeRepository();
        var service = new AiDraftService(repository);
        var owner = Guid.NewGuid();
        var result = await service.CreateAsync(new CreateAiDraftRequest("  Trà sữa  ", "Ít ngọt"), owner, default);
        Assert.NotEqual(Guid.Empty, result.JobId);
        Assert.Equal(result.JobId, repository.Request!.JobId);
        Assert.Equal(owner, repository.Request.OwnerId);
        Assert.Equal("Trà sữa", repository.Request.Request.RecipeName);
        Assert.Equal("Ít ngọt", repository.Request.Request.Description);
    }

    [Fact]
    public async Task GetHidesJobsOwnedByAnotherUser()
    {
        var repository = new FakeRepository { Job = new AiDraftStoredJob(Guid.NewGuid(), new AiDraftResponse("pending", null, null, null, null)) };
        var service = new AiDraftService(repository);
        Assert.Null(await service.GetAsync(Guid.NewGuid(), Guid.NewGuid(), default));
    }

    private sealed class FakeRepository : IAiDraftRepository
    {
        public AiDraftStoredJob? Job { get; init; }
        public AiDraftRequestedEvent? Request { get; private set; }
        public Task<(AiDraftCatalogIngredient[] Ingredients, AiDraftCatalogUnit[] Units)> GetCatalogAsync(CancellationToken cancellationToken) =>
            Task.FromResult((Array.Empty<AiDraftCatalogIngredient>(), Array.Empty<AiDraftCatalogUnit>()));
        public Task EnqueueAsync(AiDraftRequestedEvent request, CancellationToken cancellationToken)
        {
            Request = request;
            return Task.CompletedTask;
        }
        public Task<AiDraftStoredJob?> GetAsync(Guid jobId, CancellationToken cancellationToken) => Task.FromResult(Job);
    }
}
