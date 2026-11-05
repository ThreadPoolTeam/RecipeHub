using System;
using System.Linq;
using System.Threading.Tasks;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RecipeHub.Content.Infrastructure.Data;
using RecipeHub.GrpcContracts.Content;
using RecipeHub.GrpcContracts.Identity;

namespace RecipeHub.Content.Api.Services;

public sealed class ContentPdfMediaQueryServiceImpl : ContentPdfMediaQuery.ContentPdfMediaQueryBase
{
    private readonly ContentDbContext _dbContext;
    private readonly IdentitySession.IdentitySessionClient _identityClient;
    private readonly ILogger<ContentPdfMediaQueryServiceImpl> _logger;

    public ContentPdfMediaQueryServiceImpl(
        ContentDbContext dbContext,
        IdentitySession.IdentitySessionClient identityClient,
        ILogger<ContentPdfMediaQueryServiceImpl> logger)
    {
        _dbContext = dbContext;
        _identityClient = identityClient;
        _logger = logger;
    }

    public override async Task<GetPdfMediaBatchResponse> GetPdfMediaBatch(
        GetPdfMediaBatchRequest request,
        ServerCallContext context)
    {
        var response = new GetPdfMediaBatchResponse { IsSuccess = false };

        // 1. Authenticate & Authorize caller
        var authHeader = context.RequestHeaders.FirstOrDefault(h => h.Key.Equals("authorization", StringComparison.OrdinalIgnoreCase))?.Value;
        if (string.IsNullOrWhiteSpace(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            response.ErrorCode = "UNAUTHORIZED";
            response.ErrorMessage = "Thiếu Bearer token hợp lệ trong header gRPC.";
            return response;
        }

        var token = authHeader.Substring("Bearer ".Length).Trim();
        try
        {
            var validateResponse = await _identityClient.ValidateAsync(
                new ValidateSessionRequest { AccessToken = token },
                cancellationToken: context.CancellationToken);

            if (!validateResponse.Valid)
            {
                response.ErrorCode = "UNAUTHORIZED";
                response.ErrorMessage = "Session không hợp lệ hoặc đã hết hạn.";
                return response;
            }

            var role = validateResponse.Role;
            if (!string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(role, "rnd", StringComparison.OrdinalIgnoreCase))
            {
                response.ErrorCode = "FORBIDDEN";
                response.ErrorMessage = "Chỉ Admin hoặc R&D mới có quyền truy vấn metadata media PDF.";
                return response;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi xác thực session với Identity Service qua gRPC.");
            response.ErrorCode = "IDENTITY_UNAVAILABLE";
            response.ErrorMessage = "Không thể liên lạc với Identity Service.";
            return response;
        }

        // 2. Query MediaAssets
        if (request.AssetIds == null || request.AssetIds.Count == 0)
        {
            response.IsSuccess = true;
            return response;
        }

        var validUuids = request.AssetIds
            .Select(id => Guid.TryParse(id, out var parsed) ? parsed : Guid.Empty)
            .Where(id => id != Guid.Empty)
            .Distinct()
            .ToList();

        if (validUuids.Count == 0)
        {
            response.IsSuccess = true;
            return response;
        }

        try
        {
            var assets = await _dbContext.MediaAssets
                .AsNoTracking()
                .Where(a => validUuids.Contains(a.PublicId) && a.State == "active")
                .ToListAsync(context.CancellationToken);

            foreach (var asset in assets)
            {
                response.Items.Add(new PdfMediaItemDto
                {
                    AssetId = asset.PublicId.ToString(),
                    MimeType = asset.MimeType,
                    ByteSize = asset.ByteSize,
                    Width = asset.Width,
                    Height = asset.Height,
                    SourceType = asset.SourceType,
                    DeliveryUrl = asset.DeliveryUrl,
                    ProviderPublicId = asset.ProviderPublicId,
                    State = asset.State
                });
            }

            response.IsSuccess = true;
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi truy vấn cơ sở dữ liệu MediaAssets.");
            response.ErrorCode = "INTERNAL_ERROR";
            response.ErrorMessage = "Lỗi khi truy vấn dữ liệu media.";
            return response;
        }
    }
}
