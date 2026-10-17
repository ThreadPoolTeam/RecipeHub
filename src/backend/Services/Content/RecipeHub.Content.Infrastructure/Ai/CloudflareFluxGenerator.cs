using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RecipeHub.Content.Application.Interfaces;

namespace RecipeHub.Content.Infrastructure.Ai;

public sealed class CloudflareFluxGenerator : IAiImageGenerator
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<CloudflareFluxGenerator> _logger;
    private readonly string? _accountId;
    private readonly string? _apiToken;
    private readonly string _model;

    public CloudflareFluxGenerator(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<CloudflareFluxGenerator> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        _accountId = configuration["Cloudflare:AccountId"] ?? configuration["CLOUDFLARE_ACCOUNT_ID"];
        _apiToken = configuration["Cloudflare:ApiToken"] ?? configuration["CLOUDFLARE_API_TOKEN"];
        _model = configuration["Cloudflare:Model"] ?? "@cf/black-forest-labs/flux-1-schnell";
    }

    public async Task<GeneratedImageResult> GenerateImageAsync(string prompt, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_accountId) || string.IsNullOrWhiteSpace(_apiToken))
        {
            _logger.LogWarning("Cloudflare credentials not configured; generating development simulated FLUX image.");
            var simulatedBytes = CreateSimulatedPngBytes();
            return new GeneratedImageResult(simulatedBytes, "image/png", 1024, 1024);
        }

        var url = $"https://api.cloudflare.com/client/v4/accounts/{_accountId}/ai/run/{_model}";

        var payload = new
        {
            prompt = prompt,
            num_steps = 4
        };

        var json = JsonSerializer.Serialize(payload);
        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiToken);

        var response = await _httpClient.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError("Cloudflare FLUX API failed with status {StatusCode}: {Error}", response.StatusCode, err);
            throw new InvalidOperationException($"Cloudflare FLUX.1 Schnell generation failed ({response.StatusCode}): {err}");
        }

        var contentType = response.Content.Headers.ContentType?.MediaType ?? "image/png";
        byte[] imageBytes;

        if (contentType.Contains("json", StringComparison.OrdinalIgnoreCase))
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;

            string? base64 = null;
            if (root.TryGetProperty("result", out var resultProp) && resultProp.TryGetProperty("image", out var imgProp))
            {
                base64 = imgProp.GetString();
            }
            else if (root.TryGetProperty("image", out var directImg))
            {
                base64 = directImg.GetString();
            }

            if (string.IsNullOrWhiteSpace(base64))
            {
                throw new InvalidOperationException("Cloudflare response JSON did not contain expected image property.");
            }

            imageBytes = Convert.FromBase64String(base64);
            contentType = "image/png";
        }
        else
        {
            imageBytes = await response.Content.ReadAsByteArrayAsync(ct);
        }

        return new GeneratedImageResult(imageBytes, contentType, 1024, 1024);
    }

    private static byte[] CreateSimulatedPngBytes()
    {
        // Minimal valid 1x1 pixel PNG bytes (transparent/blank)
        return new byte[]
        {
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
            0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x04, 0x00, // 1024 x 1024
            0x08, 0x02, 0x00, 0x00, 0x00, 0x04, 0x1B, 0x6E, 0x36,
            0x00, 0x00, 0x00, 0x0E, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
            0x78, 0x9C, 0x63, 0x60, 0x60, 0x60, 0x00, 0x00, 0x00, 0x04, 0x00, 0x01, 0x03, 0x54, 0x01, 0x41,
            0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, // IEND chunk
            0xAE, 0x42, 0x60, 0x82
        };
    }
}
