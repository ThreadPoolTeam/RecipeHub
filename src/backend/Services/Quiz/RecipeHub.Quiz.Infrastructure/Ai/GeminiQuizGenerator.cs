using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RecipeHub.Quiz.Application.DTOs;
using RecipeHub.Quiz.Application.Exceptions;
using RecipeHub.Quiz.Application.Interfaces;

namespace RecipeHub.Quiz.Infrastructure.Ai;

public sealed class GeminiQuizGenerator : IQuizAiGenerator
{
    private const int MaxKeys = 10;
    private static readonly TimeSpan CallTimeout = TimeSpan.FromSeconds(90);

    private readonly HttpClient _httpClient;
    private readonly ILogger<GeminiQuizGenerator> _logger;
    private readonly string[] _apiKeys;
    private readonly string _model;
    private int _keyIndex = -1;

    public GeminiQuizGenerator(HttpClient httpClient, IConfiguration configuration, ILogger<GeminiQuizGenerator> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _model = configuration["Gemini:Model"] ?? "gemini-2.5-flash";
        _apiKeys = LoadApiKeys(configuration);
    }

    private static string[] LoadApiKeys(IConfiguration configuration)
    {
        var flat = configuration["GEMINI_API_KEYS"] ?? configuration["Gemini:ApiKeys"] ?? configuration["Gemini:ApiKey"];
        var raw = string.IsNullOrWhiteSpace(flat)
            ? Enumerable.Range(0, MaxKeys).Select(i => configuration[$"Gemini:ApiKeys:{i}"] ?? string.Empty)
            : flat.Split(new[] { ';', ',', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
        return raw.Select(k => k.Trim()).Where(k => k.Length > 0).Distinct().Take(MaxKeys).ToArray();
    }

    public async Task<List<QuestionManagementDto>> GenerateQuestionsAsync(QuizAiInput input, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(input);
        if (input.Count <= 0) throw new ArgumentException("Số câu hỏi cần tạo phải lớn hơn 0.", nameof(input));
        if (_apiKeys.Length == 0) throw new InvalidOperationException("Chưa cấu hình Gemini API key, không thể tạo câu hỏi bằng AI.");
        var payload = BuildPayload(input);
        for (var attempt = 0; attempt < _apiKeys.Length; attempt++)
        {
            var key = _apiKeys[(int)((uint)Interlocked.Increment(ref _keyIndex) % (uint)_apiKeys.Length)];
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(CallTimeout);

            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Post, $"https://generativelanguage.googleapis.com/v1beta/models/{_model}:generateContent")
                {
                    Content = new StringContent(payload, Encoding.UTF8, "application/json")
                };
                request.Headers.Add("x-goog-api-key", key);
                using var response = await _httpClient.SendAsync(request, timeoutCts.Token);

                if (response.StatusCode == HttpStatusCode.TooManyRequests || (int)response.StatusCode >= 500)
                {
                    _logger.LogWarning("Gemini trả về mã {StatusCode}, chuyển sang API key tiếp theo.", (int)response.StatusCode);
                    continue;
                }
                if (!response.IsSuccessStatusCode)
                {
                    throw new QuizDependencyException($"Gemini từ chối yêu cầu với mã {(int)response.StatusCode}.");
                }

                return GeminiQuizResponseParser.Parse(await response.Content.ReadAsStringAsync(timeoutCts.Token), input.Count);
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                throw new QuizDependencyException("Gemini không phản hồi trong 90 giây. Vui lòng thử lại sau.");
            }
            catch (HttpRequestException)
            {
                _logger.LogWarning("Lỗi kết nối khi gọi Gemini, chuyển sang API key tiếp theo.");
            }
        }

        throw new QuizDependencyException("Gemini tạm thời không khả dụng. Vui lòng thử lại sau.");
    }

    private static string BuildPayload(QuizAiInput input)
    {
        using var schema = JsonDocument.Parse(GeminiQuizResponseParser.ResponseSchemaJson);
        return JsonSerializer.Serialize(new
        {
            systemInstruction = new { parts = new[] { new { text = QuizAiPromptBuilder.BuildSystemInstruction(input.Count) } } },
            contents = new[] { new { role = "user", parts = new[] { new { text = QuizAiPromptBuilder.BuildRecipeContent(input) } } } },
            generationConfig = new
            {
                temperature = 0.3,
                maxOutputTokens = 32768,
                responseMimeType = "application/json",
                responseSchema = schema.RootElement,
                thinkingConfig = new { thinkingBudget = 0 }
            }
        });
    }
}
