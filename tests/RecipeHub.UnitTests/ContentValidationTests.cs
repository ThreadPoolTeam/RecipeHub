using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using RecipeHub.Content.Application.DTOs;
using RecipeHub.Content.Domain;
using RecipeHub.Content.Infrastructure.Ai;
using Xunit;

namespace RecipeHub.UnitTests;

public class ContentValidationTests
{
    [Fact]
    public void CreateDraftRequest_ShouldDisallowUnmappedMembers_LikeAspectRatio()
    {
        // JSON containing client-specified aspectRatio, width, height must be rejected
        var invalidJson = """
        {
            "recipeVersionId": "d3c4b5a6-f7e8-9a0b-1c2d-3e4f5a6b7c8d",
            "targetKind": "final_product",
            "aspectRatio": "16:9",
            "width": 1920,
            "expectedRecipeRevision": 1
        }
        """;

        Assert.Throws<JsonException>(() =>
        {
            JsonSerializer.Deserialize<CreateDraftRequest>(invalidJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        });
    }

    [Fact]
    public void CreateDraftRequest_ShouldDeserializeValidRequest()
    {
        var validJson = """
        {
            "recipeVersionId": "d3c4b5a6-f7e8-9a0b-1c2d-3e4f5a6b7c8d",
            "targetKind": "final_product",
            "userBrief": "Natural lighting",
            "expectedRecipeRevision": 1
        }
        """;

        var request = JsonSerializer.Deserialize<CreateDraftRequest>(validJson, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        Assert.NotNull(request);
        Assert.Equal("final_product", request.TargetKind);
        Assert.Equal("Natural lighting", request.UserBrief);
    }

    [Fact]
    public async Task GeminiPromptTranslator_WithoutKeys_ShouldThrowException_NotFallback()
    {
        var config = new ConfigurationBuilder().Build();
        var translator = new GeminiPromptTranslator(
            new HttpClient(),
            config,
            NullLogger<GeminiPromptTranslator>.Instance);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            translator.TranslateAndBuildPromptAsync("{}", "Brief"));

        Assert.Contains("Gemini API keys are not configured", ex.Message);
    }

    [Fact]
    public void AiImageDraft_Transitions_ShouldFollowLifecycleInvariants()
    {
        var draft = new AiImageDraft
        {
            RecipeVersionRef = Guid.NewGuid(),
            RecipeStepRef = null,
            TargetKind = "final_product",
            UserBrief = "User brief",
            InputSnapshot = "{}",
            Provider = "CloudflareSchnell",
            Model = "@cf/black-forest-labs/flux-1-schnell",
            CreatedByUserRef = Guid.NewGuid()
        };

        Assert.Equal("queued", draft.State);
        Assert.Null(draft.GeneratedAt);

        var leaseToken = Guid.NewGuid();
        draft.StartProcessing(leaseToken, TimeSpan.FromMinutes(5));
        Assert.Equal("processing", draft.State);
        Assert.Equal(leaseToken, draft.LeaseToken);

        draft.MarkGenerated("A detailed food prompt", "temp/image.png", "image/png", 50000, 1024, 1024, TimeSpan.FromMinutes(30));
        Assert.Equal("generated", draft.State);
        Assert.Equal("temp/image.png", draft.TemporaryImagePath);
        Assert.NotNull(draft.GeneratedAt);
        Assert.NotNull(draft.ExpiresAt);

        var actor = Guid.NewGuid();
        draft.StartAccepting(Guid.NewGuid(), TimeSpan.FromMinutes(2));
        Assert.Equal("accepting", draft.State);

        draft.MarkAccepted(actor);
        Assert.Equal("accepted", draft.State);
        Assert.Equal(actor, draft.DecidedByUserRef);
        Assert.Null(draft.TemporaryImagePath); // Cleaned after accept
    }
}
