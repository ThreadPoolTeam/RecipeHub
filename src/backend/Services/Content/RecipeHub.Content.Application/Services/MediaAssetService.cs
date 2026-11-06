using System.Text.Json;
using RecipeHub.Content.Application.DTOs;
using RecipeHub.Content.Application.Exceptions;
using RecipeHub.Content.Application.Interfaces;
using RecipeHub.Content.Domain;

namespace RecipeHub.Content.Application.Services;

public sealed class MediaAssetService : IMediaAssetService
{
    private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10MB
    private static readonly HashSet<string> AllowedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png",
        "image/webp"
    };

    private readonly IMediaAssetRepository _mediaAssetRepository;
    private readonly IImageDraftRepository _draftRepository;
    private readonly IOutboxRepository _outboxRepository;
    private readonly IContentUnitOfWork _unitOfWork;
    private readonly IMediaStorage _mediaStorage;
    private readonly IRecipeContextClient _recipeContextClient;
    private readonly IContentCallerContext _callerContext;

    public MediaAssetService(
        IMediaAssetRepository mediaAssetRepository,
        IImageDraftRepository draftRepository,
        IOutboxRepository outboxRepository,
        IContentUnitOfWork unitOfWork,
        IMediaStorage mediaStorage,
        IRecipeContextClient recipeContextClient,
        IContentCallerContext callerContext)
    {
        _mediaAssetRepository = mediaAssetRepository;
        _draftRepository = draftRepository;
        _outboxRepository = outboxRepository;
        _unitOfWork = unitOfWork;
        _mediaStorage = mediaStorage;
        _recipeContextClient = recipeContextClient;
        _callerContext = callerContext;
    }
    public async Task<MediaAssetDetailResponse> UploadMediaAssetAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        long length,
        CancellationToken ct = default)
    {
        var userId = _callerContext.UserId;
        if (userId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("Cần JWT session Identity hợp lệ.");
        }
        if (length <= 0)
        {
            throw new ValidationException("Uploaded file cannot be empty.");
        }

        if (length > MaxFileSizeBytes)
        {
            throw new ValidationException($"File size exceeds the 10MB limit (actual: {length} bytes).");
        }

        if (!AllowedMimeTypes.Contains(contentType))
        {
            throw new ValidationException($"Unsupported content type '{contentType}'. Supported formats: jpeg, png, webp.");
        }

        var safeFileName = string.IsNullOrWhiteSpace(fileName) ? $"upload_{Guid.NewGuid():N}.jpg" : Path.GetFileName(fileName);
        var storedResult = await _mediaStorage.UploadAsync(fileStream, safeFileName, contentType, "manual-uploads", ct);

        var asset = new MediaAsset
        {
            PublicId = Guid.NewGuid(),
            AiImageDraftId = null,
            StorageProvider = MediaAsset.DefaultStorageProvider,
            ProviderPublicId = storedResult.ProviderPublicId,
            DeliveryUrl = storedResult.DeliveryUrl,
            OriginalFileName = safeFileName,
            MimeType = contentType,
            ByteSize = length,
            Width = storedResult.Width > 0 ? storedResult.Width : 1920,
            Height = storedResult.Height > 0 ? storedResult.Height : 1080,
            SourceType = MediaAsset.SourceTypeReal,
            State = MediaAsset.StateActive,
            CreatedByUserRef = userId,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var outboxMessage = new OutboxMessage
        {
            Id = Guid.NewGuid(),
            EventType = OutboxMessage.EventTypeMediaAssetUploaded,
            Payload = JsonSerializer.Serialize(new
            {
                MediaAssetId = asset.PublicId,
                DeliveryUrl = asset.DeliveryUrl,
                SourceType = asset.SourceType,
                CreatedByUserRef = userId,
                CreatedAt = DateTimeOffset.UtcNow
            }),
            CreatedAt = DateTimeOffset.UtcNow
        };

        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await _mediaAssetRepository.AddAsync(asset, ct);
            await _outboxRepository.AddAsync(outboxMessage, ct);
            await _mediaAssetRepository.SaveChangesAsync(ct);
        }, ct);

        return new MediaAssetDetailResponse
        {
            AssetId = asset.PublicId,
            DeliveryUrl = asset.DeliveryUrl,
            SourceType = asset.SourceType,
            MimeType = asset.MimeType,
            ByteSize = asset.ByteSize,
            Width = asset.Width,
            Height = asset.Height,
            OriginalFileName = asset.OriginalFileName,
            CreatedAt = asset.CreatedAt,
            AiDraftId = null
        };
    }

    public async Task<PagedResult<MediaAssetSummaryResponse>> GetMediaAssetsAsync(
        string? sourceType,
        string? state,
        string? search,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 24;
        if (pageSize > 100) pageSize = 100;

        var targetState = string.IsNullOrWhiteSpace(state) ? MediaAsset.StateActive : state;
        var (items, totalCount) = await _mediaAssetRepository.ListAsync(sourceType, targetState, search, page, pageSize, ct);

        var dtos = items.Select(item => new MediaAssetSummaryResponse
        {
            AssetId = item.PublicId,
            DeliveryUrl = item.DeliveryUrl,
            SourceType = item.SourceType,
            MimeType = item.MimeType,
            ByteSize = item.ByteSize,
            Width = item.Width,
            Height = item.Height,
            OriginalFileName = item.OriginalFileName,
            CreatedAt = item.CreatedAt
        }).ToArray();

        return new PagedResult<MediaAssetSummaryResponse>
        {
            Items = dtos,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<MediaAssetDetailResponse?> GetMediaAssetByIdAsync(Guid assetId, CancellationToken ct = default)
    {
        var asset = await _mediaAssetRepository.GetByPublicIdAsync(assetId, ct);
        if (asset == null)
        {
            return null;
        }

        var isViewer = _callerContext.Role.Equals("viewer", StringComparison.OrdinalIgnoreCase);
        if (isViewer)
        {
            var usages = await _recipeContextClient.GetMediaUsagesAsync(assetId, ct);
            if (usages.Count == 0)
            {
                throw new ForbiddenException("Viewer không có quyền truy cập media asset này.");
            }

            var versionIds = usages
                .Select(u => u.RecipeVersionId)
                .Distinct()
                .Take(100)
                .ToList();

            var eligibleVersions = await _recipeContextClient.GetRecipeVersionsEligibilityAsync(versionIds, ct);
            if (!eligibleVersions.Any(v => v.IsEligible))
            {
                throw new ForbiddenException("Viewer không có quyền truy cập media asset này.");
            }
        }
        Guid? aiDraftPublicId = null;
        if (!isViewer && asset.AiImageDraftId.HasValue)
        {
            var draft = await _draftRepository.GetByIdAsync(asset.AiImageDraftId.Value, ct);
            aiDraftPublicId = draft?.PublicId;
        }

        return new MediaAssetDetailResponse
        {
            AssetId = asset.PublicId,
            DeliveryUrl = asset.DeliveryUrl,
            SourceType = asset.SourceType,
            MimeType = asset.MimeType,
            ByteSize = asset.ByteSize,
            Width = asset.Width,
            Height = asset.Height,
            OriginalFileName = asset.OriginalFileName,
            CreatedAt = asset.CreatedAt,
            AiDraftId = aiDraftPublicId
        };
    }

    public async Task<MediaAssetUsagesResponse> GetMediaAssetUsagesAsync(Guid assetId, CancellationToken ct = default)
    {
        var asset = await _mediaAssetRepository.GetByPublicIdAsync(assetId, ct);
        if (asset == null)
        {
            throw new NotFoundException($"Media asset '{assetId}' not found.");
        }

        var usages = await _recipeContextClient.GetMediaUsagesAsync(assetId, ct);

        return new MediaAssetUsagesResponse
        {
            AssetId = assetId,
            Usages = usages,
            TotalCount = usages.Count
        };
    }
}
