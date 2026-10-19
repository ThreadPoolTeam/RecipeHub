using System.Text.Json;
using RecipeHub.Content.Application.DTOs;
using RecipeHub.Content.Application.Exceptions;
using RecipeHub.Content.Application.Interfaces;
using RecipeHub.Content.Domain;

namespace RecipeHub.Content.Application.Services;

public sealed class ImageDraftService : IImageDraftService
{
    private readonly IImageDraftRepository _draftRepository;
    private readonly IMediaAssetRepository _mediaAssetRepository;
    private readonly IOutboxRepository _outboxRepository;
    private readonly IContentUnitOfWork _unitOfWork;
    private readonly ITemporaryImageStore _temporaryImageStore;
    private readonly IMediaStorage _mediaStorage;
    private readonly IRecipeContextClient _recipeContextClient;

    public ImageDraftService(
        IImageDraftRepository draftRepository,
        IMediaAssetRepository mediaAssetRepository,
        IOutboxRepository outboxRepository,
        IContentUnitOfWork unitOfWork,
        ITemporaryImageStore temporaryImageStore,
        IMediaStorage mediaStorage,
        IRecipeContextClient recipeContextClient)
    {
        _draftRepository = draftRepository;
        _mediaAssetRepository = mediaAssetRepository;
        _outboxRepository = outboxRepository;
        _unitOfWork = unitOfWork;
        _temporaryImageStore = temporaryImageStore;
        _mediaStorage = mediaStorage;
        _recipeContextClient = recipeContextClient;
    }

    public async Task<DraftDetailResponse> CreateDraftAsync(CreateDraftRequest request, Guid userId, CancellationToken ct = default)
    {
        ValidateCreateRequest(request);

        var context = await _recipeContextClient.GetRecipeAiContextAsync(
            request.RecipeVersionId,
            request.RecipeStepId,
            request.TargetKind,
            userId,
            ct);

        if (!context.IsSuccess)
        {
            switch (context.ErrorCode)
            {
                case "NOT_FOUND":
                case "STEP_NOT_FOUND":
                    throw new NotFoundException(context.ErrorMessage ?? "Recipe context target not found.");
                case "FORBIDDEN":
                    throw new ForbiddenException(context.ErrorMessage ?? "Not authorized to access recipe context.");
                case "VERSION_LOCKED":
                    throw new ConflictException(context.ErrorMessage ?? "Recipe version is approved or locked.");
                default:
                    throw new ValidationException(context.ErrorMessage ?? "Failed to acquire recipe AI context.");
            }
        }


        var activeDraft = await _draftRepository.GetLatestActiveForTargetAsync(request.RecipeVersionId, request.RecipeStepId, ct);
        if (activeDraft != null && (activeDraft.State == AiImageDraft.StateQueued || activeDraft.State == AiImageDraft.StateProcessing))
        {
            throw new ConflictException("An image generation job is already in progress for this recipe target.");
        }

        var inputSnapshotJson = JsonSerializer.Serialize(context);

        var draft = new AiImageDraft
        {
            PublicId = Guid.NewGuid(),
            RecipeVersionRef = request.RecipeVersionId,
            RecipeStepRef = request.RecipeStepId,
            TargetKind = request.TargetKind,
            UserBrief = request.UserBrief,
            InputSnapshot = inputSnapshotJson,
            Provider = AiImageDraft.DefaultProvider,
            Model = AiImageDraft.DefaultModel,
            GeometryMode = AiImageDraft.DefaultGeometryMode,
            State = AiImageDraft.StateQueued,
            CreatedByUserRef = userId,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var outboxMessage = new OutboxMessage
        {
            Id = Guid.NewGuid(),
            EventType = OutboxMessage.EventTypeImageDraftQueued,
            Payload = JsonSerializer.Serialize(new
            {
                DraftId = draft.PublicId,
                RecipeVersionId = draft.RecipeVersionRef,
                RecipeStepId = draft.RecipeStepRef,
                TargetKind = draft.TargetKind,
                UserBrief = draft.UserBrief,
                CreatedByUserRef = userId,
                TimestampUtc = DateTimeOffset.UtcNow
            }),
            CreatedAt = DateTimeOffset.UtcNow
        };

        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await _draftRepository.AddAsync(draft, ct);
            await _outboxRepository.AddAsync(outboxMessage, ct);
            await _draftRepository.SaveChangesAsync(ct);
        }, ct);

        return MapToDetail(draft);
    }

    public async Task<DraftDetailResponse?> GetDraftByIdAsync(Guid draftId, CancellationToken ct = default)
    {
        var draft = await _draftRepository.GetByPublicIdAsync(draftId, ct);
        if (draft == null)
        {
            return null;
        }

        if (draft.State == AiImageDraft.StateGenerated && draft.IsExpired)
        {
            draft.MarkExpired();
            await _draftRepository.SaveChangesAsync(ct);
        }

        Guid? mediaAssetId = null;
        if (draft.State == AiImageDraft.StateAccepted)
        {
            var asset = await _mediaAssetRepository.GetByAiDraftIdAsync(draft.Id, ct);
            mediaAssetId = asset?.PublicId;
        }

        return MapToDetail(draft, mediaAssetId);
    }

    public async Task<(Stream Stream, string MimeType)?> GetDraftImageStreamAsync(Guid draftId, CancellationToken ct = default)
    {
        var draft = await _draftRepository.GetByPublicIdAsync(draftId, ct);
        if (draft == null)
        {
            return null;
        }

        if (draft.IsExpired || draft.State == AiImageDraft.StateExpired)
        {
            if (draft.State != AiImageDraft.StateExpired)
            {
                draft.MarkExpired();
                await _draftRepository.SaveChangesAsync(ct);
            }
            throw new DraftExpiredException("Draft preview has expired (30-minute limit).");
        }

        if (string.IsNullOrEmpty(draft.TemporaryImagePath) || draft.State != AiImageDraft.StateGenerated)
        {
            throw new DraftExpiredException("Draft image preview is no longer available.");
        }

        var stream = await _temporaryImageStore.OpenReadAsync(draft.TemporaryImagePath, ct);
        if (stream == null)
        {
            throw new DraftExpiredException("Temporary image file not found on server.");
        }

        return (stream, draft.MimeType ?? "image/png");
    }

    public async Task<PagedResult<DraftSummaryResponse>> GetDraftsAsync(
        Guid? recipeVersionId,
        Guid? recipeStepId,
        string? state,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var (items, totalCount) = await _draftRepository.ListAsync(recipeVersionId, recipeStepId, state, page, pageSize, ct);

        var dtos = items.Select(item => new DraftSummaryResponse
        {
            DraftId = item.PublicId,
            TargetKind = item.TargetKind,
            State = item.State,
            CreatedAt = item.CreatedAt,
            ExpiresAt = item.ExpiresAt,
            PreviewUrl = item.State == AiImageDraft.StateGenerated && !item.IsExpired
                ? $"/api/v1/content/image-drafts/{item.PublicId}/image"
                : null
        }).ToArray();

        return new PagedResult<DraftSummaryResponse>
        {
            Items = dtos,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<DraftDetailResponse> RegenerateDraftAsync(Guid draftId, RegenerateDraftRequest request, Guid userId, CancellationToken ct = default)
    {
        var existingDraft = await _draftRepository.GetByPublicIdAsync(draftId, ct);
        if (existingDraft == null)
        {
            throw new NotFoundException($"Draft '{draftId}' not found.");
        }

        var context = await _recipeContextClient.GetRecipeAiContextAsync(
            existingDraft.RecipeVersionRef,
            existingDraft.RecipeStepRef,
            existingDraft.TargetKind,
            userId,
            ct);

        if (!context.IsSuccess)
        {
            throw new ValidationException(context.ErrorMessage ?? "Failed to acquire recipe AI context for regeneration.");
        }


        var newDraft = new AiImageDraft
        {
            PublicId = Guid.NewGuid(),
            RecipeVersionRef = existingDraft.RecipeVersionRef,
            RecipeStepRef = existingDraft.RecipeStepRef,
            TargetKind = existingDraft.TargetKind,
            UserBrief = request.UserBrief ?? existingDraft.UserBrief,
            InputSnapshot = JsonSerializer.Serialize(context),
            Provider = AiImageDraft.DefaultProvider,
            Model = AiImageDraft.DefaultModel,
            GeometryMode = AiImageDraft.DefaultGeometryMode,
            State = AiImageDraft.StateQueued,
            CreatedByUserRef = userId,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var outboxMessage = new OutboxMessage
        {
            Id = Guid.NewGuid(),
            EventType = OutboxMessage.EventTypeImageDraftQueued,
            Payload = JsonSerializer.Serialize(new
            {
                DraftId = newDraft.PublicId,
                RecipeVersionId = newDraft.RecipeVersionRef,
                RecipeStepId = newDraft.RecipeStepRef,
                TargetKind = newDraft.TargetKind,
                UserBrief = newDraft.UserBrief,
                CreatedByUserRef = userId,
                TimestampUtc = DateTimeOffset.UtcNow
            }),
            CreatedAt = DateTimeOffset.UtcNow
        };

        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await _draftRepository.AddAsync(newDraft, ct);
            await _outboxRepository.AddAsync(outboxMessage, ct);
            await _draftRepository.SaveChangesAsync(ct);
        }, ct);

        return MapToDetail(newDraft);
    }

    public async Task<AcceptDraftResponse> AcceptDraftAsync(Guid draftId, Guid userId, CancellationToken ct = default)
    {
        var draft = await _draftRepository.GetByPublicIdAsync(draftId, ct);
        if (draft == null)
        {
            throw new NotFoundException($"Draft '{draftId}' not found.");
        }

        if (draft.State == AiImageDraft.StateAccepted)
        {
            var existingAsset = await _mediaAssetRepository.GetByAiDraftIdAsync(draft.Id, ct);
            if (existingAsset != null)
            {
                return new AcceptDraftResponse
                {
                    MediaAssetId = existingAsset.PublicId,
                    DeliveryUrl = existingAsset.DeliveryUrl,
                    DraftId = draft.PublicId,
                    AcceptedAt = draft.DecidedAt ?? draft.CreatedAt
                };
            }
            throw new ConflictException("Draft has already been accepted.");
        }

        if (draft.State == AiImageDraft.StateDiscarded)
        {
            throw new ConflictException("Cannot accept a discarded draft.");
        }

        if (draft.IsExpired || draft.State == AiImageDraft.StateExpired)
        {
            draft.MarkExpired();
            await _draftRepository.SaveChangesAsync(ct);
            throw new DraftExpiredException("Draft has expired (30-minute window). Cannot accept.");
        }

        if (draft.State == AiImageDraft.StateAccepting && draft.LeaseExpiresAt.HasValue && draft.LeaseExpiresAt.Value > DateTimeOffset.UtcNow)
        {
            throw new ConflictException("Draft is currently being processed by another accept operation.");
        }

        if (draft.State != AiImageDraft.StateGenerated && draft.State != AiImageDraft.StateAccepting)
        {
            throw new ConflictException($"Draft must be in 'generated' state to accept, current state: '{draft.State}'.");
        }

        var leaseToken = Guid.NewGuid();
        draft.StartAccepting(leaseToken, TimeSpan.FromMinutes(2));
        await _draftRepository.SaveChangesAsync(ct);

        if (string.IsNullOrEmpty(draft.TemporaryImagePath) || !_temporaryImageStore.Exists(draft.TemporaryImagePath))
        {
            draft.MarkFailed("IMAGE_NOT_FOUND", "Temporary draft image file is missing.");
            await _draftRepository.SaveChangesAsync(ct);
            throw new DraftExpiredException("Temporary image file is missing.");
        }

        StoredMediaResult storedResult;
        var tempPath = draft.TemporaryImagePath;
        try
        {
            await using var stream = await _temporaryImageStore.OpenReadAsync(tempPath, ct);
            if (stream == null)
            {
                throw new DraftExpiredException("Unable to open temporary image file.");
            }

            var extension = Path.GetExtension(tempPath);
            var fileName = $"ai_{draft.PublicId:N}{extension}";
            storedResult = await _mediaStorage.UploadAsync(stream, fileName, draft.MimeType ?? "image/png", "ai-illustrations", ct);
        }
        catch (Exception)
        {
            draft.RevertAcceptingToGenerated();
            await _draftRepository.SaveChangesAsync(ct);
            throw;
        }

        var asset = new MediaAsset
        {
            PublicId = Guid.NewGuid(),
            AiImageDraftId = draft.Id,
            StorageProvider = MediaAsset.DefaultStorageProvider,
            ProviderPublicId = storedResult.ProviderPublicId,
            DeliveryUrl = storedResult.DeliveryUrl,
            OriginalFileName = $"ai_flux_{draft.PublicId:N}.png",
            MimeType = draft.MimeType ?? "image/png",
            ByteSize = storedResult.ByteSize > 0 ? storedResult.ByteSize : (draft.ByteSize ?? 0),
            Width = storedResult.Width > 0 ? storedResult.Width : (draft.Width ?? 1024),
            Height = storedResult.Height > 0 ? storedResult.Height : (draft.Height ?? 1024),
            SourceType = MediaAsset.SourceTypeAiIllustration,
            State = MediaAsset.StateActive,
            CreatedByUserRef = userId,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var outboxMessage = new OutboxMessage
        {
            Id = Guid.NewGuid(),
            EventType = OutboxMessage.EventTypeMediaAssetAccepted,
            Payload = JsonSerializer.Serialize(new
            {
                MediaAssetId = asset.PublicId,
                DraftId = draft.PublicId,
                RecipeVersionId = draft.RecipeVersionRef,
                RecipeStepId = draft.RecipeStepRef,
                DeliveryUrl = asset.DeliveryUrl,
                CreatedByUserRef = userId,
                AcceptedAt = DateTimeOffset.UtcNow
            }),
            CreatedAt = DateTimeOffset.UtcNow
        };

        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await _mediaAssetRepository.AddAsync(asset, ct);
            draft.MarkAccepted(userId);
            await _outboxRepository.AddAsync(outboxMessage, ct);
            await _draftRepository.SaveChangesAsync(ct);
        }, ct);

        try
        {
            await _temporaryImageStore.DeleteAsync(tempPath, ct);
        }
        catch
        {
            // Background cleanup will handle any remaining file
        }

        return new AcceptDraftResponse
        {
            MediaAssetId = asset.PublicId,
            DeliveryUrl = asset.DeliveryUrl,
            DraftId = draft.PublicId,
            AcceptedAt = draft.DecidedAt ?? DateTimeOffset.UtcNow
        };
    }

    public async Task<DraftDetailResponse> DiscardDraftAsync(Guid draftId, Guid userId, CancellationToken ct = default)
    {
        var draft = await _draftRepository.GetByPublicIdAsync(draftId, ct);
        if (draft == null)
        {
            throw new NotFoundException($"Draft '{draftId}' not found.");
        }

        if (draft.State == AiImageDraft.StateAccepted)
        {
            throw new ConflictException("Cannot discard an already accepted draft.");
        }

        var tempPath = draft.TemporaryImagePath;
        draft.MarkDiscarded(userId);
        await _draftRepository.SaveChangesAsync(ct);

        if (!string.IsNullOrEmpty(tempPath))
        {
            try
            {
                await _temporaryImageStore.DeleteAsync(tempPath, ct);
            }
            catch
            {
                // Ignored
            }
        }

        return MapToDetail(draft);
    }

    private static void ValidateCreateRequest(CreateDraftRequest request)
    {
        if (request.TargetKind != AiImageDraft.TargetKindFinalProduct &&
            request.TargetKind != AiImageDraft.TargetKindStepInstruction)
        {
            throw new ValidationException($"Invalid targetKind '{request.TargetKind}'. Must be 'final_product' or 'step_instruction'.");
        }

        if (request.TargetKind == AiImageDraft.TargetKindFinalProduct && request.RecipeStepId.HasValue)
        {
            throw new ValidationException("recipeStepId must be null when targetKind is 'final_product'.");
        }

        if (request.TargetKind == AiImageDraft.TargetKindStepInstruction && !request.RecipeStepId.HasValue)
        {
            throw new ValidationException("recipeStepId is required when targetKind is 'step_instruction'.");
        }

        if (request.UserBrief != null && request.UserBrief.Length > 500)
        {
            throw new ValidationException("userBrief cannot exceed 500 characters.");
        }
    }

    private static DraftDetailResponse MapToDetail(AiImageDraft draft, Guid? mediaAssetId = null)
    {
        var isGeneratedActive = draft.State == AiImageDraft.StateGenerated && !draft.IsExpired;

        return new DraftDetailResponse
        {
            DraftId = draft.PublicId,
            RecipeVersionId = draft.RecipeVersionRef,
            RecipeStepId = draft.RecipeStepRef,
            TargetKind = draft.TargetKind,
            State = draft.State,
            UserBrief = draft.UserBrief,
            CreatedAt = draft.CreatedAt,
            GeneratedAt = draft.GeneratedAt,
            ExpiresAt = draft.ExpiresAt,
            DecidedAt = draft.DecidedAt,
            StatusUrl = $"/api/v1/content/image-drafts/{draft.PublicId}",
            PreviewUrl = isGeneratedActive ? $"/api/v1/content/image-drafts/{draft.PublicId}/image" : null,
            MediaAssetId = mediaAssetId,
            Width = draft.Width,
            Height = draft.Height,
            ErrorCode = draft.ErrorCode,
            ErrorMessage = draft.ErrorMessage
        };
    }
}
