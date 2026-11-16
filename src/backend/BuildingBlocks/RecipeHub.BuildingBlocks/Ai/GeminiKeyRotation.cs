using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace RecipeHub.BuildingBlocks.Ai;

public static class GeminiKeyRotation
{
    public static string[] GetKeys(IConfiguration configuration)
    {
        var raw = configuration["GEMINI_API_KEYS"] ?? configuration["Gemini:ApiKeys"] ?? configuration["Gemini:ApiKey"] ?? configuration["GEMINI_API_KEY"];
        return (string.IsNullOrWhiteSpace(raw)
                ? Enumerable.Range(0, 10).Select(i => configuration[$"Gemini:ApiKeys:{i}"]).Where(k => !string.IsNullOrWhiteSpace(k)).Select(k => k!.Trim())
                : raw.Split(new[] { ';', ',', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            .Distinct(StringComparer.Ordinal).Take(10).ToArray();
    }

    public static async Task<HttpResponseMessage> SendAsync(HttpClient client, string[] keys, Func<HttpRequestMessage> createRequest, ILogger logger, CancellationToken ct)
    {
        if (keys.Length == 0) throw new InvalidOperationException("Gemini API keys are not configured.");
        for (var index = 0; index < keys.Length; index++)
        {
            using var request = createRequest();
            request.Headers.Add("x-goog-api-key", keys[index]);
            HttpResponseMessage response;
            try { response = await client.SendAsync(request, ct); }
            catch (HttpRequestException)
            {
                logger.LogWarning("Gemini key index {Index} failed.", index);
                if (index + 1 == keys.Length) throw;
                continue;
            }
            if ((response.StatusCode != HttpStatusCode.TooManyRequests && (int)response.StatusCode < 500) || index + 1 == keys.Length)
            {
                logger.LogInformation("Gemini key index {Index} returned HTTP {StatusCode}.", index, (int)response.StatusCode);
                return response;
            }
            logger.LogWarning("Gemini key index {Index} returned HTTP {StatusCode}; trying the next key.", index, (int)response.StatusCode);
            response.Dispose();
        }
        throw new InvalidOperationException("All Gemini API keys failed.");
    }
}
