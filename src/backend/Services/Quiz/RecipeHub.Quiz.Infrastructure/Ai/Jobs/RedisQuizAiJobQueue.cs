using System.Text.Json;
using RecipeHub.Quiz.Application.Interfaces;
using RecipeHub.Quiz.Application.Models;
using StackExchange.Redis;

namespace RecipeHub.Quiz.Infrastructure.Ai.Jobs;

public sealed class RedisQuizAiJobQueue : IQuizAiJobQueue
{
    public const string StreamName = "quiz.ai-generation.v1";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IDatabase _db;

    public RedisQuizAiJobQueue(IConnectionMultiplexer? redis = null)
    {
        _db = redis?.GetDatabase()
            ?? throw new InvalidOperationException("Chưa cấu hình Redis, không thể dùng tạo đề bằng AI.");
    }

    public async Task EnqueueAsync(QuizAiJobPayload payload, CancellationToken ct = default)
    {
        var json = JsonSerializer.Serialize(payload, JsonOptions);
        await _db.StreamAddAsync(StreamName, new NameValueEntry[]
        {
            new("jobId", payload.Job.JobId.ToString()),
            new("payload", json)
        });
    }
}
