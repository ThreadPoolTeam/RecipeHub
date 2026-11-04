using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using Grpc.Core;
using Microsoft.Extensions.Logging;
using RecipeHub.GrpcContracts.Content;
using RecipeHub.Recipe.Application.Interfaces;

namespace RecipeHub.Recipe.Infrastructure.Documents;

public sealed class ContentPdfMediaResolver : IPdfMediaResolver
{
    private readonly ContentPdfMediaQuery.ContentPdfMediaQueryClient _grpcClient;
    private readonly ILogger<ContentPdfMediaResolver> _logger;
    private readonly ConcurrentDictionary<Guid, ResolvedPdfMedia> _cache = new();
    private static readonly HttpClient _mediaHttpClient = new(new SocketsHttpHandler
    {
        AllowAutoRedirect = false,
        ConnectTimeout = TimeSpan.FromSeconds(5)
    });
    public ContentPdfMediaResolver(
        ContentPdfMediaQuery.ContentPdfMediaQueryClient grpcClient,
        HttpClient httpClient,
        ILogger<ContentPdfMediaResolver> logger)
    {
        _grpcClient = grpcClient;
        _logger = logger;
    }

    public async Task<IReadOnlyDictionary<Guid, ResolvedPdfMedia>> ResolveBatchAsync(
        IEnumerable<Guid> assetIds,
        string? userBearerToken,
        CancellationToken ct = default)
    {
        var distinctIds = assetIds
            .Where(id => id != Guid.Empty)
            .Distinct()
            .ToList();

        if (distinctIds.Count == 0)
        {
            return new Dictionary<Guid, ResolvedPdfMedia>();
        }

        var result = new Dictionary<Guid, ResolvedPdfMedia>();
        var uncachedIds = new List<Guid>();

        foreach (var id in distinctIds)
        {
            if (_cache.TryGetValue(id, out var cached))
            {
                result[id] = cached;
            }
            else
            {
                uncachedIds.Add(id);
            }
        }

        if (uncachedIds.Count == 0)
        {
            return result;
        }

        // 1. Prepare gRPC request
        var request = new GetPdfMediaBatchRequest();
        foreach (var id in uncachedIds)
        {
            request.AssetIds.Add(id.ToString());
        }

        var headers = new Metadata();
        if (!string.IsNullOrWhiteSpace(userBearerToken))
        {
            var token = userBearerToken.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                ? userBearerToken
                : $"Bearer {userBearerToken}";
            headers.Add("authorization", token);
        }

        GetPdfMediaBatchResponse response;
        try
        {
            response = await _grpcClient.GetPdfMediaBatchAsync(request, headers, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi gọi ContentPdfMediaQuery gRPC.");
            throw new InvalidOperationException("Không thể kết nối tới Content Service để lấy thông tin media.", ex);
        }

        if (!response.IsSuccess)
        {
            _logger.LogWarning("ContentPdfMediaQuery trả về lỗi: {ErrorCode} - {ErrorMessage}", response.ErrorCode, response.ErrorMessage);
            throw new InvalidOperationException($"Lỗi truy vấn media từ Content Service: {response.ErrorMessage ?? response.ErrorCode}");
        }

        // 2. Fetch image bytes for each item
        foreach (var item in response.Items)
        {
            if (!Guid.TryParse(item.AssetId, out var assetGuid))
            {
                continue;
            }

            if (string.IsNullOrWhiteSpace(item.DeliveryUrl) ||
                !Uri.TryCreate(item.DeliveryUrl, UriKind.Absolute, out var uri) ||
                !IsAllowedMediaUri(uri))
            {
                _logger.LogWarning("Media asset {AssetId} có delivery URL không hợp lệ hoặc không thuộc allowlist HTTPS CDN.", item.AssetId);
                continue;
            }

            try
            {
                using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                timeoutCts.CancelAfter(TimeSpan.FromSeconds(15));

                var currentUri = uri;
                HttpResponseMessage? httpResp = null;
                int redirects = 0;
                while (redirects < 3)
                {
                    if (!IsAllowedMediaUri(currentUri))
                    {
                        _logger.LogWarning("Media asset {AssetId} redirect tới URI không an toàn.", item.AssetId);
                        break;
                    }

                    using var req = new HttpRequestMessage(HttpMethod.Get, currentUri);
                    httpResp = await _mediaHttpClient.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, timeoutCts.Token);

                    if ((int)httpResp.StatusCode is >= 300 and <= 399)
                    {
                        var location = httpResp.Headers.Location;
                        httpResp.Dispose();
                        httpResp = null;
                        if (location == null) break;

                        currentUri = location.IsAbsoluteUri ? location : new Uri(currentUri, location);
                        redirects++;
                        continue;
                    }
                    break;
                }

                if (httpResp == null || !httpResp.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Không thể tải ảnh {AssetId}: Status {StatusCode}", item.AssetId, httpResp?.StatusCode);
                    httpResp?.Dispose();
                    continue;
                }

                using (httpResp)
                {
                    var contentLength = httpResp.Content.Headers.ContentLength;
                    if (contentLength.HasValue && contentLength.Value > 10 * 1024 * 1024)
                    {
                        _logger.LogWarning("Ảnh {AssetId} vượt quá 10MB ({Bytes} bytes), bỏ qua.", item.AssetId, contentLength.Value);
                        continue;
                    }

                    using var stream = await httpResp.Content.ReadAsStreamAsync(timeoutCts.Token);
                    using var ms = new MemoryStream();
                    var buffer = new byte[81920];
                    int read;
                    long totalBytes = 0;
                    var exceedsLimit = false;
                    while ((read = await stream.ReadAsync(buffer, 0, buffer.Length, timeoutCts.Token)) > 0)
                    {
                        totalBytes += read;
                        if (totalBytes > 10 * 1024 * 1024)
                        {
                            _logger.LogWarning("Ảnh {AssetId} vượt quá 10MB trong lúc stream, hủy tải.", item.AssetId);
                            exceedsLimit = true;
                            break;
                        }
                        ms.Write(buffer, 0, read);
                    }

                    if (exceedsLimit) continue;

                    var imageBytes = ms.ToArray();
                    var checksum = Convert.ToHexString(SHA256.HashData(imageBytes)).ToLowerInvariant();
                    var resolved = new ResolvedPdfMedia
                    {
                        AssetId = assetGuid,
                        Metadata = new PdfMediaMetadata
                        {
                            AssetId = assetGuid,
                            MimeType = item.MimeType,
                            ByteSize = item.ByteSize > 0 ? item.ByteSize : imageBytes.Length,
                            Width = item.Width,
                            Height = item.Height,
                            SourceType = item.SourceType,
                            DeliveryUrl = item.DeliveryUrl,
                            ProviderPublicId = item.ProviderPublicId
                        },
                        Data = imageBytes,
                        ChecksumSha256 = checksum
                    };

                    _cache[assetGuid] = resolved;
                    result[assetGuid] = resolved;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tải ảnh cho asset {AssetId}.", item.AssetId);
            }
        }

        return result;
    }

    private static bool IsAllowedMediaUri(Uri uri)
    {
        if (uri.Scheme != Uri.UriSchemeHttps)
            return false;

        var host = uri.Host.ToLowerInvariant();
        if (host == "localhost" || host == "127.0.0.1" || host == "::1" ||
            host.StartsWith("169.254.") || host.StartsWith("10.") || host.StartsWith("192.168."))
            return false;

        if (host == "res.cloudinary.com" || host.EndsWith(".cloudinary.com", StringComparison.OrdinalIgnoreCase))
            return true;

        return false;
    }
}
