using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.DependencyInjection;
using RecipeHub.Recipe.Application;
using RecipeHub.Recipe.Application.DTOs;
using RecipeHub.Recipe.Application.Interfaces;
using RecipeHub.Recipe.Application.Services;
using RecipeHub.Recipe.Domain.Entities;
using Xunit;

namespace RecipeHub.UnitTests;

public class PdfDocumentServiceTests
{
    private class FakeRepository : IPdfDocumentRepository
    {
        public bool FinalizeReadyResult { get; set; } = true;
        public bool FinalizeFailedResult { get; set; } = true;
        public bool ClearCleanupCalled { get; private set; }
        public bool FailedFinalizeCalled { get; private set; }
        public bool? LastStorageCleanupRequired { get; private set; }

        public RecipeVersion? VersionToReturn { get; set; }
        public PdfDocument? DocumentToReturn { get; set; }

        public Task CreateDraftDocumentAsync(PdfDocument document, CancellationToken ct = default) => Task.CompletedTask;

        public Task ReserveAsync(PdfDocument document, IEnumerable<PdfDocumentItem> items, CancellationToken ct = default)
        {
            document.Id = 1;
            return Task.CompletedTask;
        }

        public Task<bool> ReserveLeaseAsync(Guid documentId, string leaseToken, TimeSpan duration, CancellationToken ct = default) => Task.FromResult(true);

        public Task<bool> FencedFinalizeReadyAsync(
            Guid publicId,
            Guid leaseToken,
            string storageAssetId,
            string storageVersion,
            long byteSize,
            string fileSha256,
            DateTime completedAt,
            CancellationToken ct = default)
        {
            return Task.FromResult(FinalizeReadyResult);
        }

        public Task<bool> FinalizeReadyDocumentAsync(
            Guid documentId,
            string leaseToken,
            string storagePublicId,
            string storageAssetId,
            string storageVersion,
            long byteSize,
            string fileSha256,
            CancellationToken ct = default)
        {
            return Task.FromResult(FinalizeReadyResult);
        }

        public Task<bool> FencedFinalizeFailedAsync(
            Guid publicId,
            Guid leaseToken,
            string errorCode,
            bool storageCleanupRequired,
            DateTime completedAt,
            CancellationToken ct = default)
        {
            FailedFinalizeCalled = true;
            LastStorageCleanupRequired = storageCleanupRequired;
            return Task.FromResult(FinalizeFailedResult);
        }

        public Task<bool> MarkFailedAsync(Guid documentId, string leaseToken, string errorCode, CancellationToken ct = default)
        {
            FailedFinalizeCalled = true;
            return Task.FromResult(FinalizeFailedResult);
        }
        public Task<bool> ClearStorageCleanupRequiredAsync(Guid publicId, CancellationToken ct = default)
        {
            ClearCleanupCalled = true;
            LastStorageCleanupRequired = false;
            return Task.FromResult(true);
        }
        public Task<PdfDocument?> GetByPublicIdAsync(Guid publicId, CancellationToken ct = default) => Task.FromResult(DocumentToReturn);
        public Task<PdfDocument?> GetByPublicIdWithItemsAsync(Guid publicId, CancellationToken ct = default) => Task.FromResult(DocumentToReturn);
        public Task<PdfDocument?> GetByIdAsync(Guid documentId, CancellationToken ct = default) => Task.FromResult(DocumentToReturn);
        public Task<PdfDocument?> GetLatestPublishedSingleByVersionIdAsync(Guid recipeVersionPublicId, CancellationToken ct = default) => Task.FromResult(DocumentToReturn);
        public Task<PdfDocument?> GetPublishedByRecipeVersionIdAsync(Guid recipeVersionId, CancellationToken ct = default) => Task.FromResult(DocumentToReturn);

        public Task<(IReadOnlyList<PdfDocument> Items, int TotalCount)> GetPagedHistoryAsync(
            string? search,
            string? documentType,
            string? exportScope,
            string? state,
            Guid? recipeVersionId,
            Guid? createdByUserId,
            DateTime? fromUtc,
            DateTime? toUtc,
            int page,
            int pageSize,
            CancellationToken ct = default)
        {
            return Task.FromResult(((IReadOnlyList<PdfDocument>)Array.Empty<PdfDocument>(), 0));
        }

        public Task<IReadOnlyList<RecipeVersion>> GetRecipeVersionsForPdfAsync(IEnumerable<Guid> versionPublicIds, CancellationToken ct = default)
        {
            var list = new List<RecipeVersion>();
            if (VersionToReturn != null) list.Add(VersionToReturn);
            return Task.FromResult<IReadOnlyList<RecipeVersion>>(list);
        }

        public Task<IReadOnlyList<PdfDocument>> GetExpiredProcessingLeasesAsync(DateTime now, int limit, CancellationToken ct = default)
        {
            return Task.FromResult<IReadOnlyList<PdfDocument>>(Array.Empty<PdfDocument>());
        }

        public List<PdfDocument> CleanupDocsToReturn { get; set; } = new();
        public Task<IReadOnlyList<PdfDocument>> GetDocumentsNeedingStorageCleanupAsync(int limit, CancellationToken ct = default)
        {
            return Task.FromResult<IReadOnlyList<PdfDocument>>(CleanupDocsToReturn);
        }
    }

    private class FakeRenderer : IPdfRenderer
    {
        public Task<byte[]> RenderAsync(FrozenPdfModel model, CancellationToken ct = default)
        {
            return Task.FromResult(new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D }); // %PDF-
        }

        public async Task RenderToStreamAsync(FrozenPdfModel model, Stream destination, CancellationToken ct = default)
        {
            var bytes = await RenderAsync(model, ct);
            await destination.WriteAsync(bytes, ct);
        }
    }
    private class FakeStorage : IPdfStorage
    {
        public bool DestroyCalled { get; private set; }
        public bool ShouldThrowOnDestroy { get; set; }
        public Exception? UploadFailure { get; set; }

        public Task<PdfStorageResult> UploadPdfAsync(string storagePublicId, Stream fileStream, CancellationToken ct = default)
        {
            if (UploadFailure != null)
                throw UploadFailure;
            return Task.FromResult(new PdfStorageResult
            {
                PublicId = storagePublicId,
                AssetId = "asset_123",
                Version = "1",
                ByteSize = 5,
                FileSha256 = "dummy_sha"
            });
        }

        public Task<Stream> OpenDownloadStreamAsync(string storagePublicId, CancellationToken ct = default)
        {
            return Task.FromResult<Stream>(new MemoryStream(new byte[] { 0x25, 0x50 }));
        }

        public Task DestroyAsync(string storagePublicId, CancellationToken ct = default)
        {
            DestroyCalled = true;
            if (ShouldThrowOnDestroy) throw new InvalidOperationException("Cloudinary destroy network error.");
            return Task.CompletedTask;
        }
    }

    private class FakeMediaResolver : IPdfMediaResolver
    {
        public Task<IReadOnlyDictionary<Guid, ResolvedPdfMedia>> ResolveBatchAsync(
            IEnumerable<Guid> assetIds,
            string? userBearerToken,
            CancellationToken ct = default)
        {
            return Task.FromResult<IReadOnlyDictionary<Guid, ResolvedPdfMedia>>(new Dictionary<Guid, ResolvedPdfMedia>());
        }
    }

    [Fact]
    public async Task ExportDocumentAsync_ThrowsConflict_WhenSnapshotHashMismatches()
    {
        var recipeGuid = Guid.NewGuid();
        var versionGuid = Guid.NewGuid();
        var repo = new FakeRepository
        {
            VersionToReturn = new RecipeVersion
            {
                PublicId = versionGuid,
                Status = "Approved",
                Name = "Cà phê muối",
                Recipe = new RecipeHub.Recipe.Domain.Entities.Recipe { PublicId = recipeGuid, Code = "REC-01", NormalizedCode = "REC-01" },
                RecipeIngredients = new List<RecipeIngredient>(),
                RecipeSteps = new List<RecipeStep>()
            }
        };

        var service = new PdfDocumentService(
            repo,
            new FakeRenderer(),
            new FakeStorage(),
            new FakeMediaResolver(),
            NullLogger<PdfDocumentService>.Instance);

        var request = new ExportPdfRequest
        {
            Title = "Công thức chuẩn",
            DocumentType = "published",
            Items = new List<PdfDocumentRequestItem>
            {
                new() { RecipeId = recipeGuid, RecipeVersionId = versionGuid }
            },
            ExpectedSnapshotHash = "invalid_hash_that_does_not_match"
        };

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            service.ExportDocumentAsync(request, Guid.NewGuid(), "token", CancellationToken.None));

        Assert.Contains("PdfSourceChanged", ex.Message);
    }

    [Fact]
    public async Task ExportDocumentAsync_ThrowsInvalidOperation_WhenPublishingDraftRecipeVersion()
    {
        var recipeGuid = Guid.NewGuid();
        var versionGuid = Guid.NewGuid();
        var repo = new FakeRepository
        {
            VersionToReturn = new RecipeVersion
            {
                PublicId = versionGuid,
                Status = "Draft", // Unapproved version!
                Name = "Trà sữa Ô Long",
                Recipe = new RecipeHub.Recipe.Domain.Entities.Recipe { PublicId = recipeGuid, Code = "REC-02", NormalizedCode = "REC-02" },
                RecipeIngredients = new List<RecipeIngredient>(),
                RecipeSteps = new List<RecipeStep>()
            }
        };

        var service = new PdfDocumentService(
            repo,
            new FakeRenderer(),
            new FakeStorage(),
            new FakeMediaResolver(),
            NullLogger<PdfDocumentService>.Instance);

        // Compute preview first to get the correct hash
        var preview = await service.GeneratePreviewAsync(new PreviewPdfRequest
        {
            Title = "Tài liệu",
            DocumentType = "published",
            Items = new List<PdfDocumentRequestItem>
            {
                new() { RecipeId = recipeGuid, RecipeVersionId = versionGuid }
            }
        }, "token", CancellationToken.None);

        var request = new ExportPdfRequest
        {
            Title = "Tài liệu",
            DocumentType = "published", // Attempting official publish
            Items = new List<PdfDocumentRequestItem>
            {
                new() { RecipeId = recipeGuid, RecipeVersionId = versionGuid }
            },
            ExpectedSnapshotHash = preview.SnapshotHash
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.ExportDocumentAsync(request, Guid.NewGuid(), "token", CancellationToken.None));

        Assert.Contains("chưa được duyệt phát hành", ex.Message);
    }

    [Fact]
    public async Task ExportDocumentAsync_CompensatesDestroy_OnlyWhenAtomicFinalizeFailedCommits()
    {
        var recipeGuid = Guid.NewGuid();
        var versionGuid = Guid.NewGuid();
        var repo = new FakeRepository
        {
            FinalizeReadyResult = false, // Lease expired on finalize!
            FinalizeFailedResult = true,  // Successfully atomically transitioned to failed
            VersionToReturn = new RecipeVersion
            {
                PublicId = versionGuid,
                Status = "published",
                Name = "Matcha Latte",
                Recipe = new RecipeHub.Recipe.Domain.Entities.Recipe { PublicId = recipeGuid, Code = "REC-03", NormalizedCode = "REC-03" },
                RecipeIngredients = new List<RecipeIngredient>(),
                RecipeSteps = new List<RecipeStep>()
            }
        };

        var storage = new FakeStorage();
        var service = new PdfDocumentService(
            repo,
            new FakeRenderer(),
            storage,
            new FakeMediaResolver(),
            NullLogger<PdfDocumentService>.Instance);

        var preview = await service.GeneratePreviewAsync(new PreviewPdfRequest
        {
            Title = "Matcha",
            DocumentType = "published",
            Items = new List<PdfDocumentRequestItem>
            {
                new() { RecipeId = recipeGuid, RecipeVersionId = versionGuid }
            }
        }, "token", CancellationToken.None);

        var request = new ExportPdfRequest
        {
            Title = "Matcha",
            DocumentType = "published",
            Items = new List<PdfDocumentRequestItem>
            {
                new() { RecipeId = recipeGuid, RecipeVersionId = versionGuid }
            },
            ExpectedSnapshotHash = preview.SnapshotHash
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.ExportDocumentAsync(request, Guid.NewGuid(), "token", CancellationToken.None));

        Assert.True(repo.FailedFinalizeCalled);
        Assert.True(storage.DestroyCalled);
        Assert.True(repo.ClearCleanupCalled);
        Assert.False(repo.LastStorageCleanupRequired);
    }

    [Fact]
    public async Task ExportDocumentAsync_RetainsCleanupMarker_WhenDestroyThrows()
    {
        var recipeGuid = Guid.NewGuid();
        var versionGuid = Guid.NewGuid();
        var repo = new FakeRepository
        {
            FinalizeReadyResult = false,
            FinalizeFailedResult = true,
            VersionToReturn = new RecipeVersion
            {
                PublicId = versionGuid,
                Status = "published",
                Name = "Cà phê trứng",
                Recipe = new RecipeHub.Recipe.Domain.Entities.Recipe { PublicId = recipeGuid, Code = "REC-04", NormalizedCode = "REC-04" },
                RecipeIngredients = new List<RecipeIngredient>(),
                RecipeSteps = new List<RecipeStep>()
            }
        };

        var storage = new FakeStorage { ShouldThrowOnDestroy = true };
        var service = new PdfDocumentService(
            repo,
            new FakeRenderer(),
            storage,
            new FakeMediaResolver(),
            NullLogger<PdfDocumentService>.Instance);

        var preview = await service.GeneratePreviewAsync(new PreviewPdfRequest
        {
            Title = "Cà phê trứng",
            DocumentType = "published",
            Items = new List<PdfDocumentRequestItem>
            {
                new() { RecipeId = recipeGuid, RecipeVersionId = versionGuid }
            }
        }, "token", CancellationToken.None);

        var request = new ExportPdfRequest
        {
            Title = "Cà phê trứng",
            DocumentType = "published",
            Items = new List<PdfDocumentRequestItem>
            {
                new() { RecipeId = recipeGuid, RecipeVersionId = versionGuid }
            },
            ExpectedSnapshotHash = preview.SnapshotHash
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.ExportDocumentAsync(request, Guid.NewGuid(), "token", CancellationToken.None));

        Assert.True(repo.FailedFinalizeCalled);
        Assert.True(storage.DestroyCalled);
        Assert.False(repo.ClearCleanupCalled);
        Assert.True(repo.LastStorageCleanupRequired);
    }

    [Theory]
    [InlineData("processing")]
    [InlineData("failed")]
    public async Task GetFileStreamAsync_NotReadyDocument_IsConflict(string state)
    {
        var repo = new FakeRepository { DocumentToReturn = new PdfDocument { State = state } };
        var service = new PdfDocumentService(repo, new FakeRenderer(), new FakeStorage(),
            new FakeMediaResolver(), NullLogger<PdfDocumentService>.Instance);
        await Assert.ThrowsAsync<ConflictException>(() =>
            service.GetFileStreamAsync(Guid.NewGuid(), "rnd", Guid.NewGuid()));
    }

    [Theory]
    [InlineData(PdfStorageFailure.Failed)]
    [InlineData(PdfStorageFailure.Unavailable)]
    [InlineData(PdfStorageFailure.Timeout)]
    public async Task ExportDocumentAsync_StorageFailure_PreservesClassificationAndCleanup(PdfStorageFailure failure)
    {
        var recipeId = Guid.NewGuid();
        var versionId = Guid.NewGuid();
        var repo = new FakeRepository
        {
            VersionToReturn = new RecipeVersion
            {
                PublicId = versionId,
                Status = "published",
                Name = "Matcha",
                Recipe = new RecipeHub.Recipe.Domain.Entities.Recipe
                {
                    PublicId = recipeId, Code = "REC-ERR", NormalizedCode = "REC-ERR"
                },
                RecipeIngredients = new List<RecipeIngredient>(),
                RecipeSteps = new List<RecipeStep>()
            }
        };
        var storage = new FakeStorage { UploadFailure = new PdfStorageException(failure, "Storage failed") };
        var service = new PdfDocumentService(repo, new FakeRenderer(), storage,
            new FakeMediaResolver(), NullLogger<PdfDocumentService>.Instance);
        var items = new List<PdfDocumentRequestItem> { new() { RecipeId = recipeId, RecipeVersionId = versionId } };
        var preview = await service.GeneratePreviewAsync(new PreviewPdfRequest
        {
            Title = "Matcha", DocumentType = "published", Items = items
        }, "token");
        var error = await Assert.ThrowsAsync<PdfStorageException>(() => service.ExportDocumentAsync(new ExportPdfRequest
        {
            Title = "Matcha", DocumentType = "published", Items = items, ExpectedSnapshotHash = preview.SnapshotHash
        }, Guid.NewGuid(), "token"));
        Assert.Equal(failure, error.Failure);
        Assert.True(repo.FailedFinalizeCalled);
        Assert.True(repo.LastStorageCleanupRequired);
        Assert.False(repo.ClearCleanupCalled);
    }

    [Fact]
    public async Task RecoveryService_RetriesStorageCleanup_AndClearsMarkerOnSuccess()
    {
        var docGuid = Guid.NewGuid();
        var repo = new FakeRepository
        {
            CleanupDocsToReturn = new List<PdfDocument>
            {
                new()
                {
                    PublicId = docGuid,
                    State = "failed",
                    StorageCleanupRequired = true,
                    StoragePublicId = $"pdf_documents/{docGuid:N}.pdf"
                }
            }
        };

        var storage = new FakeStorage();
        var services = new Microsoft.Extensions.DependencyInjection.ServiceCollection();
        var serviceProvider = services.BuildServiceProvider();
        var recoveryService = new RecipeHub.Recipe.Infrastructure.Documents.PdfDocumentRecoveryService(
            serviceProvider,
            NullLogger<RecipeHub.Recipe.Infrastructure.Documents.PdfDocumentRecoveryService>.Instance);

        await recoveryService.RunRecoveryIterationAsync(repo, storage, CancellationToken.None);

        Assert.True(storage.DestroyCalled);
        Assert.True(repo.ClearCleanupCalled);
    }
}
