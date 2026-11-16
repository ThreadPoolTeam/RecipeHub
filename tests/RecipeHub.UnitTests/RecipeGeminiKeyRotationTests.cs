using System.Net;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using RecipeHub.BuildingBlocks.Ai;
using Xunit;

namespace RecipeHub.UnitTests;

public class RecipeGeminiKeyRotationTests
{
    private sealed class Handler(params HttpStatusCode[] statuses) : HttpMessageHandler
    {
        public List<string> Keys { get; } = [];
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Keys.Add(request.Headers.GetValues("x-goog-api-key").Single());
            return Task.FromResult(new HttpResponseMessage(statuses[Keys.Count - 1]));
        }
    }

    [Fact]
    public async Task TriesKeysInOrderUntilSuccess()
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["GEMINI_API_KEYS"] = " one, two;one,three " }).Build();
        var keys = GeminiKeyRotation.GetKeys(config);
        var handler = new Handler(HttpStatusCode.TooManyRequests, HttpStatusCode.ServiceUnavailable, HttpStatusCode.OK);
        using var client = new HttpClient(handler);
        using var response = await GeminiKeyRotation.SendAsync(client, keys, () => new HttpRequestMessage(HttpMethod.Post, "https://example.invalid"), NullLogger.Instance, CancellationToken.None);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(new[] { "one", "two", "three" }, handler.Keys);
    }

    [Fact]
    public async Task ExhaustionReturnsLastFailure()
    {
        var handler = new Handler(HttpStatusCode.TooManyRequests, HttpStatusCode.InternalServerError);
        using var client = new HttpClient(handler);
        using var response = await GeminiKeyRotation.SendAsync(client, ["one", "two"], () => new HttpRequestMessage(HttpMethod.Post, "https://example.invalid"), NullLogger.Instance, CancellationToken.None);
        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal(new[] { "one", "two" }, handler.Keys);
    }

    [Fact]
    public void ReadsAtMostTenDistinctKeys()
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["GEMINI_API_KEYS"] = string.Join(',', Enumerable.Range(0, 12)) }).Build();
        Assert.Equal(Enumerable.Range(0, 10).Select(i => i.ToString()), GeminiKeyRotation.GetKeys(config));
    }
}
