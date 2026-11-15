using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RecipeHub.Quiz.Application.Exceptions;
using RecipeHub.Quiz.Application.Interfaces;
using RecipeHub.Quiz.Infrastructure.Ai;
using Xunit;

namespace RecipeHub.Quiz.Tests;

public class GeminiQuizGeneratorTests
{
    private const string Key = "secret-gemini-test-key";
    private static readonly QuizAiInput Input = new("Coffee", null, null,
        Array.Empty<QuizAiIngredient>(), Array.Empty<QuizAiStep>(), 2, Array.Empty<string>());

    [Fact]
    public async Task ValidJsonReturnsQuestionsWithOneCorrectOptionAfterShuffle()
    {
        var generator = CreateGenerator(Response(Questions(2)));
        var result = await generator.GenerateQuestionsAsync(Input);

        Assert.Equal(2, result.Count);
        Assert.Equal(new[] { "Question 1", "Question 2" }, result.Select(q => q.Content));
        Assert.All(result, question =>
        {
            Assert.Equal(4, question.Options.Count);
            Assert.Equal(new[] { 1, 2, 3, 4 }, question.Options.Select(option => option.SortOrder));
            Assert.Equal("Correct", Assert.Single(question.Options.Where(option => option.IsCorrect)).Content);
            Assert.Equal(new[] { "Correct", "Wrong 1", "Wrong 2", "Wrong 3" },
                question.Options.Select(option => option.Content).OrderBy(content => content));
        });
    }

    [Theory]
    [InlineData("not-json")]
    [InlineData("{\"questions\":[")]
    public async Task BrokenJsonThrowsDependencyException(string text)
    {
        var generator = CreateGenerator(Response(text));
        await Assert.ThrowsAsync<QuizDependencyException>(() => generator.GenerateQuestionsAsync(Input));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("{\"questions\":[]}")]
    public async Task EmptyOutputThrowsDependencyException(string text)
    {
        var generator = CreateGenerator(Response(text));
        await Assert.ThrowsAsync<QuizDependencyException>(() => generator.GenerateQuestionsAsync(Input));
    }

    [Fact]
    public async Task MaxTokensRejectsEvenValidOutput()
    {
        var generator = CreateGenerator(Response(Questions(2), "MAX_TOKENS"));
        var error = await Assert.ThrowsAsync<QuizDependencyException>(() => generator.GenerateQuestionsAsync(Input));
        Assert.Contains("giảm số câu", error.Message);
    }

    [Fact]
    public async Task ExtraQuestionsAreTrimmedToCount()
    {
        var generator = CreateGenerator(Response(Questions(3)));
        var result = await generator.GenerateQuestionsAsync(Input);
        Assert.Equal(new[] { "Question 1", "Question 2" }, result.Select(q => q.Content));
    }

    [Fact]
    public async Task MissingKeyFailsBeforeSendingRequest()
    {
        var handler = new StubHandler(_ => throw new InvalidOperationException("Unexpected request"));
        var generator = CreateGenerator(handler, key: null);
        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => generator.GenerateQuestionsAsync(Input));
        Assert.Contains("API key", error.Message);
        Assert.Equal(0, handler.RequestCount);
    }

    [Fact]
    public async Task ApiKeyIsSentInHeaderNotUri()
    {
        var handler = new StubHandler(request =>
        {
            Assert.DoesNotContain(Key, request.RequestUri!.ToString(), StringComparison.Ordinal);
            Assert.Equal(Key, Assert.Single(request.Headers.GetValues("x-goog-api-key")));
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(Response(Questions(2))) };
        });
        var result = await CreateGenerator(handler).GenerateQuestionsAsync(Input);
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task ConnectionFailureDoesNotLogApiKey()
    {
        var logger = new CapturingLogger();
        var handler = new StubHandler(_ => throw new HttpRequestException($"Connection failed: {Key}"));
        var generator = CreateGenerator(handler, logger: logger);

        await Assert.ThrowsAsync<QuizDependencyException>(() => generator.GenerateQuestionsAsync(Input));
        Assert.NotEmpty(logger.Entries);
        Assert.DoesNotContain(logger.Entries, entry => entry.Contains(Key, StringComparison.Ordinal));
    }

    private static string Questions(int count) => JsonSerializer.Serialize(new
    {
        questions = Enumerable.Range(1, count).Select(i => new
        {
            content = $"Question {i}", explanation = "Explanation",
            options = new[]
            {
                new { content = "Correct", isCorrect = true },
                new { content = "Wrong 1", isCorrect = false },
                new { content = "Wrong 2", isCorrect = false },
                new { content = "Wrong 3", isCorrect = false }
            }
        })
    });

    private static string Response(string text, string finishReason = "STOP") => JsonSerializer.Serialize(new
    {
        candidates = new[] { new { finishReason, content = new { parts = new[] { new { text } } } } }
    });

    private static GeminiQuizGenerator CreateGenerator(string body) =>
        CreateGenerator(new StubHandler(_ => new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(body) }));

    private static GeminiQuizGenerator CreateGenerator(StubHandler handler, string? key = Key, CapturingLogger? logger = null)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["Gemini:ApiKey"] = key }).Build();
        return new GeminiQuizGenerator(new HttpClient(handler), configuration, logger ?? new CapturingLogger());
    }

    private sealed class StubHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        public int RequestCount { get; private set; }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            RequestCount++;
            return Task.FromResult(respond(request));
        }
    }

    private sealed class CapturingLogger : ILogger<GeminiQuizGenerator>
    {
        public List<string> Entries { get; } = new();
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter) => Entries.Add(formatter(state, exception) + exception);
    }
}
