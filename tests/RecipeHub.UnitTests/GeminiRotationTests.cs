using System.Net;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using RecipeHub.Content.Infrastructure.Ai;
using Xunit;

namespace RecipeHub.UnitTests;

public class GeminiRotationTests
{
    private sealed class MockHttpHandler : HttpMessageHandler
    {
        public List<string> RequestedUrls { get; } = [];
        public int CallCount { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CallCount++;
            RequestedUrls.Add(request.RequestUri?.ToString() ?? "");

            // If the URL has key1, simulate 429 Too Many Requests
            if (request.RequestUri?.Query.Contains("key=key1") == true)
            {
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.TooManyRequests));
            }

            // If the URL has key2, succeed with candidate JSON
            if (request.RequestUri?.Query.Contains("key=key2") == true)
            {
                var responseJson = """
                {
                    "candidates": [
                        {
                            "content": {
                                "parts": [
                                    { "text": "Delicious brewed peach tea with fresh slices on rustic wood." }
                                ]
                            }
                        }
                    ]
                }
                """;
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(responseJson)
                });
            }

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.InternalServerError));
        }
    }

    [Fact]
    public async Task GeminiPromptTranslator_ShouldRotateToNextKey_WhenEncountering429()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["GEMINI_API_KEYS"] = "key1,key2,key3"
            })
            .Build();

        var handler = new MockHttpHandler();
        var httpClient = new HttpClient(handler);

        var translator = new GeminiPromptTranslator(
            httpClient,
            config,
            NullLogger<GeminiPromptTranslator>.Instance);

        var result = await translator.TranslateAndBuildPromptAsync("{}", "User brief");

        Assert.Equal("Delicious brewed peach tea with fresh slices on rustic wood.", result);
        Assert.True(handler.CallCount >= 2, "Expected at least 2 attempts due to 429 rotation.");
        Assert.Contains(handler.RequestedUrls, u => u.Contains("key=key1"));
        Assert.Contains(handler.RequestedUrls, u => u.Contains("key=key2"));
    }
}
