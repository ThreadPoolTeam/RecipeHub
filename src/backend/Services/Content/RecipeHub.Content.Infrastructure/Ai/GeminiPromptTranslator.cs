using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RecipeHub.Content.Application.Interfaces;

namespace RecipeHub.Content.Infrastructure.Ai;

public sealed class GeminiPromptTranslator : IAiImagePromptTranslator
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<GeminiPromptTranslator> _logger;
    private readonly string[] _apiKeys;
    private readonly string _model;
    private int _keyIndex = -1;

    public GeminiPromptTranslator(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<GeminiPromptTranslator> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        _model = configuration["Gemini:Model"] ?? "gemini-2.5-flash";

        // Read up to 10 keys from GEMINI_API_KEYS or Gemini:ApiKeys or Gemini:ApiKey
        var rawKeys = configuration["GEMINI_API_KEYS"]
                      ?? configuration["Gemini:ApiKeys"]
                      ?? configuration["Gemini:ApiKey"]
                      ?? configuration["GEMINI_API_KEY"];

        if (!string.IsNullOrWhiteSpace(rawKeys))
        {
            var splitKeys = rawKeys
                .Split(new[] { ';', ',', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(k => !string.IsNullOrWhiteSpace(k))
                .Distinct()
                .Take(10)
                .ToArray();

            _apiKeys = splitKeys.Length > 0 ? splitKeys : [];
        }
        else
        {
            // Also check array configuration format Gemini:ApiKeys:0, Gemini:ApiKeys:1, ...
            var keysList = new List<string>();
            for (var i = 0; i < 10; i++)
            {
                var key = configuration[$"Gemini:ApiKeys:{i}"];
                if (!string.IsNullOrWhiteSpace(key))
                {
                    keysList.Add(key.Trim());
                }
            }
            _apiKeys = keysList.Distinct().ToArray();
        }
    }

    public async Task<string> TranslateAndBuildPromptAsync(
        string inputSnapshotJson,
        string? userBrief,
        CancellationToken ct = default)
    {
        if (_apiKeys.Length == 0)
        {
            _logger.LogError("Gemini API keys not configured. Plan rejects fake fallback prompts.");
            throw new InvalidOperationException("Gemini API keys are not configured. Cannot synthesize image prompt.");
        }

        var systemInstruction =
            "You are an expert culinary food photographer and AI prompt engineer. " +
            "Given the recipe information and instructions, translate and create a highly detailed, appetizing English prompt " +
            "suitable for FLUX.1 Schnell image generation. " +
            "Focus on food textures, lighting, camera angle, color harmony, and plating. " +
            "Do NOT include text, letters, watermarks, hands, or artificial borders in the scene. " +
            "The prompt must be pure descriptive text, under 1800 characters.";

        var promptPayload = new
        {
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new { text = $"{systemInstruction}\n\nRecipe Context Snapshot: {inputSnapshotJson}\nUser Brief / Custom Adjustment: {userBrief ?? "None"}\n\nOutput ONLY the final English prompt for image generation, without explanations or quotes:" }
                    }
                }
            },
            generationConfig = new
            {
                temperature = 0.7,
                maxOutputTokens = 500
            }
        };

        var jsonString = JsonSerializer.Serialize(promptPayload);
        var attempts = _apiKeys.Length;

        for (var i = 0; i < attempts; i++)
        {
            var currentIndex = (int)((uint)Interlocked.Increment(ref _keyIndex) % (uint)_apiKeys.Length);
            var apiKey = _apiKeys[currentIndex];

            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_model}:generateContent?key={apiKey}";

            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Post, url)
                {
                    Content = new StringContent(jsonString, Encoding.UTF8, "application/json")
                };

                var response = await _httpClient.SendAsync(request, ct);

                if (response.StatusCode == HttpStatusCode.TooManyRequests || (int)response.StatusCode == 429)
                {
                    _logger.LogWarning("Gemini key index {Index} encountered 429 Too Many Requests. Rotating to next key.", currentIndex);
                    continue; // Try next key in round-robin
                }

                if (!response.IsSuccessStatusCode)
                {
                    var errorBody = await response.Content.ReadAsStringAsync(ct);
                    _logger.LogWarning("Gemini API error (Status {StatusCode}): {Error}. Retrying next key.", response.StatusCode, errorBody);
                    continue;
                }

                var responseBody = await response.Content.ReadAsStringAsync(ct);
                using var doc = JsonDocument.Parse(responseBody);

                if (doc.RootElement.TryGetProperty("candidates", out var candidates) &&
                    candidates.GetArrayLength() > 0)
                {
                    var firstCandidate = candidates[0];
                    if (firstCandidate.TryGetProperty("content", out var content) &&
                        content.TryGetProperty("parts", out var parts) &&
                        parts.GetArrayLength() > 0)
                    {
                        var text = parts[0].GetProperty("text").GetString()?.Trim();
                        if (!string.IsNullOrWhiteSpace(text))
                        {
                            return CleanPrompt(text);
                        }
                    }
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "Exception calling Gemini API with key index {Index}. Rotating key.", currentIndex);
            }
        }

        _logger.LogError("All Gemini API keys exhausted or failed rate limits. Plan rejects fake fallback prompts.");
        throw new InvalidOperationException("All Gemini API keys failed or exhausted rate limit (429). Prompt synthesis failed.");
    }

    private static string CleanPrompt(string prompt)
    {
        var cleaned = prompt.Trim('"', '\'', '`', ' ', '\n', '\r');
        if (cleaned.Length > 2048)
        {
            throw new InvalidOperationException($"Prompt generated by Gemini ({cleaned.Length} characters) exceeds maximum FLUX Schnell limit of 2048 characters. Plan strictly rejects silent truncation.");
        }
        return cleaned;
    }

}
