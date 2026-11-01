using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using RecipeHub.Recipe.Application.DTOs;
using RecipeHub.Recipe.Application.Interfaces;
using RecipeHub.Recipe.Domain.Entities;

namespace RecipeHub.Recipe.Application.Services;

public sealed class PdfDocumentService : IPdfDocumentService
{
    private readonly IPdfDocumentRepository _repository;
    private readonly IPdfRenderer _renderer;
    private readonly IPdfStorage _storage;
    private readonly IPdfMediaResolver _mediaResolver;
    private readonly ILogger<PdfDocumentService> _logger;

    public PdfDocumentService(
        IPdfDocumentRepository repository,
        IPdfRenderer renderer,
        IPdfStorage storage,
        IPdfMediaResolver mediaResolver,
        ILogger<PdfDocumentService> logger)
    {
        _repository = repository;
        _renderer = renderer;
        _storage = storage;
        _mediaResolver = mediaResolver;
        _logger = logger;
    }

    public Task<PdfCapabilitiesResponse> GetCapabilitiesAsync(CancellationToken ct = default)
    {
        return Task.FromResult(new PdfCapabilitiesResponse());
    }

    public async Task<PdfPreviewResult> GeneratePreviewAsync(
        PreviewPdfRequest request,
        string? userSessionToken,
        CancellationToken ct = default)
    {
        ValidateRequest(request.Title, request.TemplateCode, request.Items);

        var (frozenModel, snapshotHash, _, _) = await BuildFrozenModelAndSnapshotAsync(
            request.DocumentType,
            request.Title,
            request.Subtitle,
            request.TemplateCode,
            request.TemplateVersion,
            request.Items,
            "Người dùng hệ thống",
            userSessionToken,
            ct);

        var memoryStream = new MemoryStream();
        await _renderer.RenderToStreamAsync(frozenModel, memoryStream, ct);
        memoryStream.Position = 0;

        return new PdfPreviewResult(memoryStream, snapshotHash);
    }

    public async Task<PdfDocumentResponse> ExportDocumentAsync(
        ExportPdfRequest request,
        Guid userId,
        string? userSessionToken,
        CancellationToken ct = default)
    {
        ValidateRequest(request.Title, request.TemplateCode, request.Items);

        if (string.IsNullOrWhiteSpace(request.ExpectedSnapshotHash))
        {
            throw new ArgumentException("Thiếu ExpectedSnapshotHash từ bản xem trước.", nameof(request.ExpectedSnapshotHash));
        }

        var (frozenModel, snapshotHash, versionEntities, sourceSnapshots) = await BuildFrozenModelAndSnapshotAsync(
            request.DocumentType,
            request.Title,
            request.Subtitle,
            request.TemplateCode,
            request.TemplateVersion,
            request.Items,
            $"User-{userId:N}",
            userSessionToken,
            ct);

        // 1. Verify snapshot hash
        if (!string.Equals(request.ExpectedSnapshotHash, snapshotHash, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("PdfSourceChanged: client expected {Expected}, calculated {Actual}", request.ExpectedSnapshotHash, snapshotHash);
            throw new ConflictException("PdfSourceChanged: Dữ liệu công thức hoặc tùy chọn hiển thị đã thay đổi kể từ lần xem trước. Vui lòng xem trước lại.");
        }

        // 2. Official publish check
        var isPublished = string.Equals(request.DocumentType, "published", StringComparison.OrdinalIgnoreCase);
        if (isPublished)
        {
            foreach (var v in versionEntities)
            {
                if (!string.Equals(v.Status, "published", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException($"Không thể xuất bản chính thức vì công thức '{v.Name}' (v{v.VersionNumber}) chưa được duyệt phát hành (Status={v.Status}).");
                }
                if (v.Recipe.ArchivedAt.HasValue)
                {
                    throw new InvalidOperationException($"Không thể xuất bản chính thức vì công thức '{v.Name}' đã bị lưu trữ.");
                }
            }
        }

        var documentPublicId = Guid.NewGuid();
        var leaseToken = Guid.NewGuid();
        var auditEventId = Guid.NewGuid();
        var storagePublicId = $"pdf_documents/{documentPublicId:N}.pdf";
        var exportScope = request.Items.Count > 1 ? "collection" : "single";
        var fileName = $"{SanitizeFileName(request.Title)}-{DateTime.UtcNow:yyyyMMdd}-{documentPublicId:N}.pdf";

        var presentationSnapshotJson = JsonSerializer.Serialize(new
        {
            request.DocumentType,
            request.Title,
            request.Subtitle,
            request.TemplateCode,
            request.TemplateVersion,
            request.Items
        });

        var pdfDoc = new PdfDocument
        {
            PublicId = documentPublicId,
            Title = request.Title.Trim(),
            DocumentType = isPublished ? "published" : "draft",
            ExportScope = exportScope,
            State = "processing",
            TemplateCode = request.TemplateCode,
            TemplateVersion = request.TemplateVersion,
            PresentationSnapshot = presentationSnapshotJson,
            SnapshotSha256 = snapshotHash,
            CreatedByUserRef = userId,
            CreatedAt = DateTime.UtcNow,
            LeaseToken = leaseToken,
            LeaseExpiresAt = DateTime.UtcNow.AddMinutes(5),
            StorageProvider = "Cloudinary",
            StoragePublicId = storagePublicId,
            StorageResourceType = "raw",
            StorageDeliveryType = "authenticated",
            FileName = fileName,
            AuditEventId = auditEventId,
            StorageCleanupRequired = false
        };

        var docItems = new List<PdfDocumentItem>();
        for (int i = 0; i < versionEntities.Count; i++)
        {
            var v = versionEntities[i];
            docItems.Add(new PdfDocumentItem
            {
                RecipeVersionId = v.Id,
                SortOrder = i + 1,
                SourceSnapshot = sourceSnapshots[i]
            });
        }

        // 3. Reserve draft document in DB
        await _repository.ReserveAsync(pdfDoc, docItems, ct);

        // 4. Render PDF
        byte[] pdfBytes;
        try
        {
            pdfBytes = await _renderer.RenderAsync(frozenModel, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi render PDF document {DocumentId}.", documentPublicId);
            await _repository.FencedFinalizeFailedAsync(documentPublicId, leaseToken, "RENDER_FAILED", false, DateTime.UtcNow, ct);
            throw new InvalidOperationException("Lỗi trong quá trình tạo định dạng file PDF.", ex);
        }

        var fileSha256 = Convert.ToHexString(SHA256.HashData(pdfBytes)).ToLowerInvariant();

        // 5. Upload to Cloudinary
        PdfStorageResult uploadResult;
        try
        {
            using var uploadStream = new MemoryStream(pdfBytes);
            uploadResult = await _storage.UploadPdfAsync(storagePublicId, uploadStream, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi upload PDF document {DocumentId} lên Cloudinary.", documentPublicId);
            await _repository.FencedFinalizeFailedAsync(documentPublicId, leaseToken, "UPLOAD_FAILED", true, DateTime.UtcNow, ct);
            if (ex is PdfStorageException)
                throw;
            throw new InvalidOperationException("Không thể lưu trữ file PDF vào hệ thống lưu trữ đám mây.", ex);
        }

        // 6. Finalize in DB
        var finalized = await _repository.FencedFinalizeReadyAsync(
            documentPublicId,
            leaseToken,
            uploadResult.AssetId,
            uploadResult.Version,
            uploadResult.ByteSize > 0 ? uploadResult.ByteSize : pdfBytes.Length,
            uploadResult.FileSha256 ?? fileSha256,
            DateTime.UtcNow,
            ct);

        if (!finalized)
        {
            _logger.LogError("Không thể chốt trạng thái ready cho PDF document {DocumentId} (có thể đã hết lease).", documentPublicId);

            // Atomic conditional transition to failed under this leaseToken with storageCleanupRequired = true
            var transitionedToFailed = await _repository.FencedFinalizeFailedAsync(
                documentPublicId,
                leaseToken,
                "LEASE_EXPIRED_ON_FINALIZE",
                storageCleanupRequired: true,
                DateTime.UtcNow,
                ct);

            // ONLY if atomic update succeeded (exactly 1 row committed to failed), we know ready did not win
            if (transitionedToFailed)
            {
                try
                {
                    await _storage.DestroyAsync(storagePublicId, ct);
                    // Clear the cleanup marker only after successful deletion
                    await _repository.ClearStorageCleanupRequiredAsync(documentPublicId, ct);
                }
                catch (Exception cleanupEx)
                {
                    _logger.LogWarning(cleanupEx, "Lỗi dọn dẹp storage cho orphaned document {DocumentId}. StorageCleanupRequired vẫn giữ true để recovery worker xử lý.", documentPublicId);
                }
            }

            throw new InvalidOperationException("Quá trình xuất PDF bị gián đoạn do hết hạn lease.");
        }

        return new PdfDocumentResponse
        {
            Id = documentPublicId,
            Title = pdfDoc.Title,
            DocumentType = pdfDoc.DocumentType,
            ExportScope = pdfDoc.ExportScope,
            State = "ready",
            TemplateCode = pdfDoc.TemplateCode,
            TemplateVersion = pdfDoc.TemplateVersion,
            CreatedByUserId = userId,
            CreatedAt = pdfDoc.CreatedAt,
            CompletedAt = DateTime.UtcNow,
            FileName = pdfDoc.FileName,
            ByteSize = uploadResult.ByteSize > 0 ? uploadResult.ByteSize : pdfBytes.Length,
            Sha256 = fileSha256,
            ItemCount = docItems.Count,
            Items = versionEntities.Select((v, idx) => new PdfDocumentItemResponse
            {
                RecipeVersionId = v.PublicId,
                RecipeCode = v.Recipe.Code,
                VersionNumber = v.VersionNumber,
                RecipeName = v.Name,
                SortOrder = idx + 1
            }).ToList()
        };
    }

    public async Task<(IReadOnlyList<PdfDocumentSummaryResponse> Items, int TotalCount)> GetHistoryAsync(
        string? search,
        string? documentType,
        string? exportScope,
        string? state,
        Guid? recipeVersionId,
        Guid? createdByUserId,
        DateTime? fromDate,
        DateTime? toDate,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        var (entities, totalCount) = await _repository.GetPagedHistoryAsync(
            search,
            documentType,
            exportScope,
            state,
            recipeVersionId,
            createdByUserId,
            fromDate,
            toDate,
            page,
            pageSize,
            ct);

        var summaries = entities.Select(d => new PdfDocumentSummaryResponse
        {
            Id = d.PublicId,
            Title = d.Title,
            DocumentType = d.DocumentType,
            ExportScope = d.ExportScope,
            State = d.State,
            TemplateCode = d.TemplateCode,
            TemplateVersion = d.TemplateVersion,
            CreatedByUserId = d.CreatedByUserRef,
            CreatedAt = d.CreatedAt,
            CompletedAt = d.CompletedAt,
            FileName = d.FileName,
            ByteSize = d.ByteSize,
            Sha256 = d.FileSha256,
            ItemCount = d.Items.Count,
            ErrorCode = d.ErrorCode
        }).ToList();

        return (summaries, totalCount);
    }

    public async Task<PdfDocumentResponse?> GetByIdAsync(Guid documentId, CancellationToken ct = default)
    {
        var doc = await _repository.GetByPublicIdWithItemsAsync(documentId, ct);
        if (doc == null)
            return null;

        return new PdfDocumentResponse
        {
            Id = doc.PublicId,
            Title = doc.Title,
            DocumentType = doc.DocumentType,
            ExportScope = doc.ExportScope,
            State = doc.State,
            TemplateCode = doc.TemplateCode,
            TemplateVersion = doc.TemplateVersion,
            CreatedByUserId = doc.CreatedByUserRef,
            CreatedAt = doc.CreatedAt,
            CompletedAt = doc.CompletedAt,
            FileName = doc.FileName,
            ByteSize = doc.ByteSize,
            Sha256 = doc.FileSha256,
            ItemCount = doc.Items.Count,
            ErrorCode = doc.ErrorCode,
            Items = doc.Items.OrderBy(i => i.SortOrder).Select(i => new PdfDocumentItemResponse
            {
                RecipeVersionId = i.RecipeVersion.PublicId,
                RecipeCode = i.RecipeVersion.Recipe.Code,
                VersionNumber = i.RecipeVersion.VersionNumber,
                RecipeName = i.RecipeVersion.Name,
                SortOrder = i.SortOrder
            }).ToList()
        };
    }

    public async Task<PublishedDocumentLookupResponse?> GetPublishedForVersionAsync(Guid recipeVersionId, CancellationToken ct = default)
    {
        var doc = await _repository.GetLatestPublishedSingleByVersionIdAsync(recipeVersionId, ct);
        if (doc == null)
            return null;

        var singleItem = doc.Items.FirstOrDefault();
        if (singleItem == null)
            return null;

        if (singleItem.RecipeVersion.Recipe.ArchivedAt.HasValue ||
            !string.Equals(singleItem.RecipeVersion.Status, "published", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return new PublishedDocumentLookupResponse
        {
            Id = doc.PublicId,
            RecipeVersionId = singleItem.RecipeVersion.PublicId,
            Title = doc.Title,
            FileName = doc.FileName,
            ByteSize = doc.ByteSize ?? 0,
            Sha256 = doc.FileSha256 ?? string.Empty,
            CompletedAt = doc.CompletedAt ?? doc.CreatedAt
        };
    }

    public async Task<PdfFileDownloadResult?> GetFileStreamAsync(
        Guid documentId,
        string role,
        Guid userId,
        CancellationToken ct = default)
    {
        var doc = await _repository.GetByPublicIdWithItemsAsync(documentId, ct);
        if (doc == null)
            return null;

        if (!string.Equals(doc.State, "ready", StringComparison.OrdinalIgnoreCase))
        {
            throw new ConflictException(string.Equals(doc.State, "processing", StringComparison.OrdinalIgnoreCase)
                ? "Tài liệu PDF đang được xử lý. Vui lòng chờ rồi thử tải lại."
                : "Tài liệu PDF chưa sẵn sàng hoặc đã xuất thất bại. Vui lòng xuất lại tài liệu.");
        }

        var isViewer = string.Equals(role, "viewer", StringComparison.OrdinalIgnoreCase);
        if (isViewer)
        {
            if (!string.Equals(doc.DocumentType, "published", StringComparison.OrdinalIgnoreCase) ||
                !string.Equals(doc.ExportScope, "single", StringComparison.OrdinalIgnoreCase) ||
                doc.Items.Count != 1)
            {
                throw new UnauthorizedAccessException("Người xem chỉ có quyền tải bản PDF chính thức (official-single).");
            }

            var item = doc.Items.First();
            if (item.RecipeVersion.Recipe.ArchivedAt.HasValue ||
                !string.Equals(item.RecipeVersion.Status, "published", StringComparison.OrdinalIgnoreCase))
            {
                throw new UnauthorizedAccessException("Công thức nguồn đã bị lưu trữ hoặc chưa được phát hành.");
            }
        }
        else if (!string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase) &&
                 !string.Equals(role, "rnd", StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException("Không có quyền truy cập tài liệu PDF.");
        }

        var stream = await _storage.OpenDownloadStreamAsync(doc.StoragePublicId, ct);
        return new PdfFileDownloadResult(stream, doc.FileName, "application/pdf");
    }

    private static void ValidateRequest(string title, string templateCode, List<PdfDocumentRequestItem> items)
    {
        if (string.IsNullOrWhiteSpace(title) || title.Trim().Length > 200)
        {
            throw new ArgumentException("Tiêu đề tài liệu bắt buộc từ 1 đến 200 ký tự.", nameof(title));
        }

        if (!string.Equals(templateCode, "detailed-landscape", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException($"Mẫu tài liệu '{templateCode}' không được hỗ trợ. Chỉ hỗ trợ 'detailed-landscape'.", nameof(templateCode));
        }

        if (items == null || items.Count == 0)
        {
            throw new ArgumentException("Danh sách công thức xuất PDF không được rỗng.", nameof(items));
        }

        if (items.Count > 50)
        {
            throw new ArgumentException("Không được xuất quá 50 công thức trong một tài liệu.", nameof(items));
        }

        var versionIds = items.Select(i => i.RecipeVersionId).ToList();
        if (versionIds.Distinct().Count() != versionIds.Count)
        {
            throw new ArgumentException("Không được trùng lặp phiên bản công thức trong cùng một tài liệu.", nameof(items));
        }
    }

    private async Task<(FrozenPdfModel Model, string SnapshotHash, List<RecipeVersion> Versions, List<string> SourceSnapshots)> BuildFrozenModelAndSnapshotAsync(
        string documentType,
        string title,
        string? subtitle,
        string templateCode,
        string templateVersion,
        List<PdfDocumentRequestItem> requestItems,
        string authorName,
        string? userSessionToken,
        CancellationToken ct)
    {
        var versionPublicIds = requestItems.Select(i => i.RecipeVersionId).ToList();

        // 1. Fetch versions from repository
        var versions = await _repository.GetRecipeVersionsForPdfAsync(versionPublicIds, ct);

        var versionMap = versions.ToDictionary(v => v.PublicId);

        // Verify all requested versions exist
        var orderedVersions = new List<RecipeVersion>();
        foreach (var reqItem in requestItems)
        {
            if (!versionMap.TryGetValue(reqItem.RecipeVersionId, out var versionEntity))
            {
                throw new KeyNotFoundException($"Không tìm thấy phiên bản công thức với ID {reqItem.RecipeVersionId}.");
            }
            if (versionEntity.Recipe.PublicId != reqItem.RecipeId)
            {
                throw new ArgumentException($"Phiên bản {reqItem.RecipeVersionId} không thuộc công thức {reqItem.RecipeId}.");
            }
            orderedVersions.Add(versionEntity);
        }

        // 2. Collect all media asset IDs
        var mediaAssetIds = new HashSet<Guid>();
        foreach (var reqItem in requestItems)
        {
            if (reqItem.CoverMediaAssetId.HasValue && reqItem.CoverMediaAssetId.Value != Guid.Empty)
            {
                mediaAssetIds.Add(reqItem.CoverMediaAssetId.Value);
            }

            foreach (var stepReq in reqItem.Steps)
            {
                foreach (var mediaReq in stepReq.Media)
                {
                    if (mediaReq.AssetId != Guid.Empty)
                    {
                        mediaAssetIds.Add(mediaReq.AssetId);
                    }
                }
            }
        }

        // 3. Resolve media via Content RPC
        var resolvedMedia = await _mediaResolver.ResolveBatchAsync(mediaAssetIds, userSessionToken, ct);

        // 4. Construct Frozen Models and Source Snapshots
        var frozenRecipes = new List<FrozenRecipeItemModel>();
        var sourceSnapshots = new List<string>();

        for (int i = 0; i < requestItems.Count; i++)
        {
            var reqItem = requestItems[i];
            var version = orderedVersions[i];

            byte[]? coverData = null;
            string? coverChecksum = null;
            if (reqItem.CoverMediaAssetId.HasValue && resolvedMedia.TryGetValue(reqItem.CoverMediaAssetId.Value, out var coverMedia))
            {
                coverData = coverMedia.Data;
                coverChecksum = coverMedia.ChecksumSha256;
            }

            var stepReqMap = reqItem.Steps.ToDictionary(s => s.StepId);

            var frozenSteps = new List<FrozenStepModel>();
            foreach (var step in version.RecipeSteps.OrderBy(s => s.SortOrder))
            {
                stepReqMap.TryGetValue(step.PublicId, out var stepReq);

                var stepMediaList = new List<FrozenStepMediaModel>();
                if (stepReq != null && stepReq.Media.Count > 0)
                {
                    foreach (var mReq in stepReq.Media)
                    {
                        if (resolvedMedia.TryGetValue(mReq.AssetId, out var resM))
                        {
                            stepMediaList.Add(new FrozenStepMediaModel
                            {
                                AssetId = mReq.AssetId,
                                Caption = mReq.Caption,
                                IsAiIllustration = string.Equals(resM.Metadata.SourceType, "ai_illustration", StringComparison.OrdinalIgnoreCase),
                                ImageData = resM.Data,
                                ImageChecksum = resM.ChecksumSha256
                            });
                        }
                    }
                }

                frozenSteps.Add(new FrozenStepModel
                {
                    StepId = step.PublicId,
                    StepOrder = step.SortOrder,
                    Instruction = string.IsNullOrWhiteSpace(step.Description) ? step.Title : $"{step.Title}: {step.Description}",
                    DurationSeconds = step.DurationSeconds,
                    Temperature = step.TemperatureCelsius.HasValue ? $"{step.TemperatureCelsius.Value:G29} °C" : null,
                    Equipment = step.Equipment,
                    SafetyNote = step.SafetyNote,
                    CompletionCriteria = step.CompletionCriteria,
                    Media = stepMediaList
                });
            }

            var frozenIngredients = version.RecipeIngredients.OrderBy(ing => ing.SortOrder).Select(ing => new FrozenIngredientModel
            {
                IngredientCode = ing.IngredientCodeSnapshot ?? ing.Ingredient?.Code ?? "",
                IngredientName = ing.IngredientNameSnapshot ?? ing.Ingredient?.Name ?? "",
                Quantity = ing.Quantity,
                UnitName = ing.Unit?.Name ?? "",
                StageName = ing.StageName,
                SortOrder = ing.SortOrder,
                Note = ing.Note
            }).ToList();

            var frozenYield = version.RecipeYield != null ? new FrozenYieldModel
            {
                Quantity = version.RecipeYield.Quantity,
                UnitName = version.RecipeYield.Unit?.Name ?? "",
                Note = version.RecipeYield.Note
            } : null;

            var frozenRecipe = new FrozenRecipeItemModel
            {
                RecipeId = version.Recipe.PublicId,
                RecipeVersionId = version.PublicId,
                RecipeCode = version.Recipe.Code,
                RecipeName = version.Name,
                TitleOverride = reqItem.TitleOverride,
                VersionNumber = version.VersionNumber,
                VersionStatus = version.Status,
                SortOrder = i + 1,
                Yield = frozenYield,
                CoverImageData = coverData,
                CoverImageChecksum = coverChecksum,
                Ingredients = frozenIngredients,
                Steps = frozenSteps
            };

            frozenRecipes.Add(frozenRecipe);

            var sourceSnapshotJson = JsonSerializer.Serialize(new
            {
                recipeCode = version.Recipe.Code,
                recipeName = version.Name,
                versionNumber = version.VersionNumber,
                versionStatus = version.Status,
                yield = frozenYield,
                ingredients = frozenIngredients,
                steps = frozenSteps.Select(s => new
                {
                    s.StepOrder,
                    s.Instruction,
                    s.DurationSeconds,
                    s.Temperature,
                    s.Equipment,
                    s.SafetyNote,
                    s.CompletionCriteria,
                    media = s.Media.Select(m => new { m.AssetId, m.Caption, m.IsAiIllustration, m.ImageChecksum })
                })
            });
            sourceSnapshots.Add(sourceSnapshotJson);
        }

        var frozenPdfModel = new FrozenPdfModel
        {
            DocumentType = documentType,
            ExportScope = requestItems.Count > 1 ? "collection" : "single",
            Title = title.Trim(),
            Subtitle = subtitle?.Trim(),
            TemplateCode = templateCode,
            TemplateVersion = templateVersion,
            AuthorName = authorName,
            RenderedAtUtc = DateTime.UtcNow,
            Recipes = frozenRecipes
        };

        // 5. Canonical hash computation
        var canonicalData = new
        {
            documentType = frozenPdfModel.DocumentType.ToLowerInvariant(),
            title = frozenPdfModel.Title,
            subtitle = frozenPdfModel.Subtitle,
            templateCode = frozenPdfModel.TemplateCode,
            templateVersion = frozenPdfModel.TemplateVersion,
            recipes = frozenRecipes.Select(r => new
            {
                r.RecipeId,
                r.RecipeVersionId,
                r.RecipeCode,
                r.RecipeName,
                r.TitleOverride,
                r.VersionNumber,
                r.SortOrder,
                coverImageChecksum = r.CoverImageChecksum,
                ingredients = r.Ingredients.Select(ing => new
                {
                    ing.IngredientCode,
                    ing.IngredientName,
                    quantity = ing.Quantity.ToString("0.######"),
                    ing.UnitName,
                    ing.StageName,
                    ing.SortOrder,
                    ing.Note
                }),
                steps = r.Steps.Select(s => new
                {
                    s.StepId,
                    s.StepOrder,
                    s.Instruction,
                    s.DurationSeconds,
                    s.Temperature,
                    s.Equipment,
                    s.SafetyNote,
                    s.CompletionCriteria,
                    media = s.Media.Select(m => new
                    {
                        m.AssetId,
                        m.Caption,
                        m.IsAiIllustration,
                        m.ImageChecksum
                    })
                })
            })
        };

        var canonicalJson = JsonSerializer.Serialize(canonicalData);
        var snapshotHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(canonicalJson))).ToLowerInvariant();

        return (frozenPdfModel, snapshotHash, orderedVersions, sourceSnapshots);
    }

    private static string SanitizeFileName(string title)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var sb = new StringBuilder();
        foreach (var c in title)
        {
            if (invalid.Contains(c) || c == ' ')
            {
                sb.Append('-');
            }
            else
            {
                sb.Append(c);
            }
        }
        var res = sb.ToString().Trim('-');
        return string.IsNullOrWhiteSpace(res) ? "document" : res;
    }
}
