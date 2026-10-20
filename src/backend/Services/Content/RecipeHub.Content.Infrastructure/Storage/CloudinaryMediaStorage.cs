using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RecipeHub.Content.Application.Interfaces;

namespace RecipeHub.Content.Infrastructure.Storage;

public sealed class CloudinaryMediaStorage : IMediaStorage
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<CloudinaryMediaStorage> _logger;
    private readonly string? _cloudName;
    private readonly string? _apiKey;
    private readonly string? _apiSecret;

    public CloudinaryMediaStorage(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<CloudinaryMediaStorage> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        _cloudName = configuration["Cloudinary:CloudName"] ?? configuration["CLOUDINARY_CLOUD_NAME"];
        _apiKey = configuration["Cloudinary:ApiKey"] ?? configuration["CLOUDINARY_API_KEY"];
        _apiSecret = configuration["Cloudinary:ApiSecret"] ?? configuration["CLOUDINARY_API_SECRET"];
    }

    public async Task<StoredMediaResult> UploadAsync(
        Stream stream,
        string fileName,
        string contentType,
        string folder,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_cloudName) || string.IsNullOrWhiteSpace(_apiKey) || string.IsNullOrWhiteSpace(_apiSecret))
        {
            _logger.LogWarning("Cloudinary credentials not fully configured; using development simulated storage.");
            var simulatedPublicId = $"{folder}/{Guid.NewGuid():N}";
            var simulatedUrl = $"https://res.cloudinary.com/recipehub-dev/image/upload/v{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}/{simulatedPublicId}.png";
            return new StoredMediaResult(simulatedPublicId, simulatedUrl, 1024, 1024, stream.Length > 0 ? stream.Length : 102400);
        }

        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var rawToSign = $"folder={folder}&timestamp={timestamp}{_apiSecret}";
        var signature = ComputeSha1(rawToSign);

        using var content = new MultipartFormDataContent();
        using var streamContent = new StreamContent(stream);
        streamContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(contentType);
        content.Add(streamContent, "file", fileName);
        content.Add(new StringContent(_apiKey), "api_key");
        content.Add(new StringContent(timestamp), "timestamp");
        content.Add(new StringContent(folder), "folder");
        content.Add(new StringContent(signature), "signature");

        var uploadUrl = $"https://api.cloudinary.com/v1_1/{_cloudName}/image/upload";
        var response = await _httpClient.PostAsync(uploadUrl, content, ct);

        var responseBody = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Cloudinary upload failed: Status {StatusCode}, Response: {Body}", response.StatusCode, responseBody);
            throw new InvalidOperationException($"Cloudinary upload failed with status {response.StatusCode}: {responseBody}");
        }

        using var doc = JsonDocument.Parse(responseBody);
        var root = doc.RootElement;

        var publicId = root.GetProperty("public_id").GetString() ?? $"{folder}/{Guid.NewGuid():N}";
        var secureUrl = root.GetProperty("secure_url").GetString() ?? root.GetProperty("url").GetString() ?? string.Empty;
        var width = root.TryGetProperty("width", out var wProp) ? wProp.GetInt32() : 1024;
        var height = root.TryGetProperty("height", out var hProp) ? hProp.GetInt32() : 1024;
        var byteSize = root.TryGetProperty("bytes", out var bProp) ? bProp.GetInt64() : stream.Length;

        return new StoredMediaResult(publicId, secureUrl, width, height, byteSize);
    }

    public async Task<bool> DeleteAsync(string providerPublicId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_cloudName) || string.IsNullOrWhiteSpace(_apiKey) || string.IsNullOrWhiteSpace(_apiSecret))
        {
            _logger.LogWarning("Cloudinary credentials not configured; simulated delete of {PublicId}", providerPublicId);
            return true;
        }

        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var rawToSign = $"public_id={providerPublicId}&timestamp={timestamp}{_apiSecret}";
        var signature = ComputeSha1(rawToSign);

        using var form = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["public_id"] = providerPublicId,
            ["timestamp"] = timestamp,
            ["api_key"] = _apiKey,
            ["signature"] = signature
        });

        var destroyUrl = $"https://api.cloudinary.com/v1_1/{_cloudName}/image/destroy";
        var response = await _httpClient.PostAsync(destroyUrl, form, ct);
        return response.IsSuccessStatusCode;
    }

    private static string ComputeSha1(string input)
    {
        var hashBytes = SHA1.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }
}
