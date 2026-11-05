using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RecipeHub.Recipe.Application;
using RecipeHub.Recipe.Application.Interfaces;

namespace RecipeHub.Recipe.Infrastructure.Storage;

public sealed class CloudinaryPdfStorage : IPdfStorage
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<CloudinaryPdfStorage> _logger;
    private readonly string? _cloudName;
    private readonly string? _apiKey;
    private readonly string? _apiSecret;

    public CloudinaryPdfStorage(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<CloudinaryPdfStorage> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        _cloudName = configuration["Cloudinary:CloudName"] ?? configuration["CLOUDINARY_CLOUD_NAME"];
        _apiKey = configuration["Cloudinary:ApiKey"] ?? configuration["CLOUDINARY_API_KEY"];
        _apiSecret = configuration["Cloudinary:ApiSecret"] ?? configuration["CLOUDINARY_API_SECRET"];
    }

    private void EnsureConfigured()
    {
        if (string.IsNullOrWhiteSpace(_cloudName) ||
            string.IsNullOrWhiteSpace(_apiKey) ||
            string.IsNullOrWhiteSpace(_apiSecret))
        {
            throw new PdfStorageException(PdfStorageFailure.Unavailable, "Kho PDF chưa được cấu hình. Vui lòng liên hệ quản trị viên.");
        }
    }

    public async Task<PdfStorageResult> UploadPdfAsync(
        string storagePublicId,
        Stream fileStream,
        CancellationToken ct = default)
    {
        EnsureConfigured();

        // 1. Buffer stream to calculate SHA-256 and stream upload
        using var memoryStream = new MemoryStream();
        await fileStream.CopyToAsync(memoryStream, ct);
        memoryStream.Position = 0;

        var sha256Bytes = await SHA256.HashDataAsync(memoryStream, ct);
        var sha256Hex = Convert.ToHexString(sha256Bytes).ToLowerInvariant();

        // 2. Prepare signing
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        // Cloudinary alphabetical sort: overwrite, public_id, timestamp, type
        var rawToSign = $"overwrite=false&public_id={storagePublicId}&timestamp={timestamp}&type=authenticated{_apiSecret}";
        var signature = ComputeSha1(rawToSign);

        using var content = new MultipartFormDataContent();
        memoryStream.Position = 0;
        using var streamContent = new StreamContent(memoryStream);
        streamContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        content.Add(streamContent, "file", $"{storagePublicId}.pdf");
        content.Add(new StringContent(_apiKey!), "api_key");
        content.Add(new StringContent(timestamp), "timestamp");
        content.Add(new StringContent(storagePublicId), "public_id");
        content.Add(new StringContent("authenticated"), "type");
        content.Add(new StringContent("false"), "overwrite");
        content.Add(new StringContent(signature), "signature");

        var uploadUrl = $"https://api.cloudinary.com/v1_1/{_cloudName}/raw/upload";
        using var request = new HttpRequestMessage(HttpMethod.Post, uploadUrl) { Content = content };
        using var response = await SendStorageRequestAsync(request, ct);
        EnsureStorageSuccess(response, isDownload: false);

        var responseBody = await response.Content.ReadAsStringAsync(ct);
        using var doc = ParseStorageResponse(responseBody);
        var root = doc.RootElement;

        if (root.ValueKind != JsonValueKind.Object ||
            !root.TryGetProperty("public_id", out var pProp) || pProp.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(pProp.GetString()))
        {
            throw new PdfStorageException(PdfStorageFailure.Failed, "Kho PDF trả về dữ liệu không hợp lệ (thiếu public_id).");
        }
        var publicId = pProp.GetString()!;

        if (!root.TryGetProperty("asset_id", out var aProp) || aProp.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(aProp.GetString()))
        {
            throw new PdfStorageException(PdfStorageFailure.Failed, "Kho PDF trả về dữ liệu không hợp lệ (thiếu asset_id).");
        }
        var assetId = aProp.GetString()!;

        if (!root.TryGetProperty("version", out var vProp) || string.IsNullOrWhiteSpace(vProp.ToString()))
        {
            throw new PdfStorageException(PdfStorageFailure.Failed, "Kho PDF trả về dữ liệu không hợp lệ (thiếu version).");
        }
        var version = vProp.ToString();

        if (!root.TryGetProperty("bytes", out var bProp) || bProp.ValueKind != JsonValueKind.Number || !bProp.TryGetInt64(out var byteSize) || byteSize <= 0)
        {
            throw new PdfStorageException(PdfStorageFailure.Failed, "Kho PDF trả về dữ liệu không hợp lệ (bytes).");
        }
        return new PdfStorageResult
        {
            PublicId = publicId,
            AssetId = assetId,
            Version = version,
            ByteSize = byteSize,
            FileSha256 = sha256Hex
        };
    }

    public Task<PdfStorageResult> UploadRawPdfAsync(Stream pdfStream, string publicId, CancellationToken ct = default)
    {
        return UploadPdfAsync(publicId, pdfStream, ct);
    }

    public async Task<Stream> OpenDownloadStreamAsync(
        string storagePublicId,
        CancellationToken ct = default)
    {
        EnsureConfigured();

        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var rawToSign = $"public_id={storagePublicId}&timestamp={timestamp}&type=authenticated{_apiSecret}";
        var signature = ComputeSha1(rawToSign);

        var downloadUrl = $"https://api.cloudinary.com/v1_1/{_cloudName}/raw/download?public_id={Uri.EscapeDataString(storagePublicId)}&timestamp={timestamp}&type=authenticated&api_key={_apiKey}&signature={signature}";

        using var request = new HttpRequestMessage(HttpMethod.Get, downloadUrl);
        var response = await SendStorageRequestAsync(request, ct, responseHeadersOnly: true);
        if (!response.IsSuccessStatusCode)
        {
            using (response)
                EnsureStorageSuccess(response, isDownload: true);
        }

        return await response.Content.ReadAsStreamAsync(ct);
    }

    public Task<Stream> OpenReadStreamAsync(string storagePublicId, CancellationToken ct = default)
    {
        return OpenDownloadStreamAsync(storagePublicId, ct);
    }

    public async Task DestroyAsync(
        string storagePublicId,
        CancellationToken ct = default)
    {
        EnsureConfigured();

        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var rawToSign = $"public_id={storagePublicId}&timestamp={timestamp}&type=authenticated{_apiSecret}";
        var signature = ComputeSha1(rawToSign);

        using var form = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["public_id"] = storagePublicId,
            ["type"] = "authenticated",
            ["timestamp"] = timestamp,
            ["api_key"] = _apiKey!,
            ["signature"] = signature
        });

        var destroyUrl = $"https://api.cloudinary.com/v1_1/{_cloudName}/raw/destroy";
        using var response = await _httpClient.PostAsync(destroyUrl, form, ct);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Cloudinary raw destroy failed: Status {StatusCode} ({StatusCodeInt})", response.StatusCode, (int)response.StatusCode);
            throw new InvalidOperationException($"Cloudinary raw destroy failed with status {response.StatusCode} ({(int)response.StatusCode})");
        }

        var responseBody = await response.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(responseBody);
        if (!doc.RootElement.TryGetProperty("result", out var resProp) ||
            resProp.ValueKind != JsonValueKind.String)
        {
            _logger.LogError("Cloudinary raw destroy returned unexpected JSON: missing result property.");
            throw new InvalidOperationException("Cloudinary raw destroy response missing valid 'result' property.");
        }

        var resStr = resProp.GetString();
        if (resStr != "ok" && resStr != "not found")
        {
            _logger.LogError("Cloudinary raw destroy returned non-ok result: {Result}", resStr);
            throw new InvalidOperationException($"Cloudinary raw destroy returned result: {resStr}");
        }
    }
    public Task DeleteRawPdfAsync(string storagePublicId, CancellationToken ct = default)
    {
        return DestroyAsync(storagePublicId, ct);
    }

    private async Task<HttpResponseMessage> SendStorageRequestAsync(HttpRequestMessage request, CancellationToken ct, bool responseHeadersOnly = false)
    {
        try
        {
            var completion = responseHeadersOnly ? HttpCompletionOption.ResponseHeadersRead : HttpCompletionOption.ResponseContentRead;
            return await _httpClient.SendAsync(request, completion, ct);
        }
        catch (OperationCanceledException ex) when (!ct.IsCancellationRequested)
        {
            throw new PdfStorageException(PdfStorageFailure.Timeout, "Kho PDF phản hồi quá thời gian chờ. Vui lòng thử lại sau.", ex);
        }
        catch (HttpRequestException ex)
        {
            throw new PdfStorageException(PdfStorageFailure.Failed, "Không thể kết nối tới kho PDF. Vui lòng thử lại sau.", ex);
        }
    }

    private void EnsureStorageSuccess(HttpResponseMessage response, bool isDownload)
    {
        if (response.IsSuccessStatusCode)
            return;

        _logger.LogWarning("Cloudinary PDF request failed: Status {StatusCode}", (int)response.StatusCode);
        if (isDownload && response.StatusCode == System.Net.HttpStatusCode.NotFound)
            throw new NotFoundException("Tệp PDF không còn trên kho lưu trữ. Vui lòng xuất lại tài liệu.");

        if (response.StatusCode is System.Net.HttpStatusCode.TooManyRequests or System.Net.HttpStatusCode.ServiceUnavailable)
            throw new PdfStorageException(PdfStorageFailure.Unavailable, "Kho PDF đang quá tải hoặc tạm ngừng phục vụ. Vui lòng thử lại sau.");

        if (response.StatusCode is System.Net.HttpStatusCode.RequestTimeout or System.Net.HttpStatusCode.GatewayTimeout)
            throw new PdfStorageException(PdfStorageFailure.Timeout, "Kho PDF phản hồi quá thời gian chờ. Vui lòng thử lại sau.");

        throw new PdfStorageException(PdfStorageFailure.Failed, "Kho PDF không xử lý được yêu cầu. Vui lòng thử lại hoặc liên hệ quản trị viên.");
    }

    private static JsonDocument ParseStorageResponse(string body)
    {
        try
        {
            return JsonDocument.Parse(body);
        }
        catch (JsonException ex)
        {
            throw new PdfStorageException(PdfStorageFailure.Failed, "Kho PDF trả về dữ liệu không hợp lệ.", ex);
        }
    }

    private static string ComputeSha1(string input)
    {
        var hashBytes = SHA1.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

    private static string ComputeSha256Hex(byte[] bytes)
    {
        var hashBytes = SHA256.HashData(bytes);
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }
}
