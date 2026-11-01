using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RecipeHub.Recipe.Application.Interfaces;

namespace RecipeHub.Recipe.Infrastructure.Documents;

public sealed class PdfDocumentRecoveryService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<PdfDocumentRecoveryService> _logger;

    public PdfDocumentRecoveryService(
        IServiceProvider serviceProvider,
        ILogger<PdfDocumentRecoveryService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("PdfDocumentRecoveryService đã khởi động.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var repository = scope.ServiceProvider.GetRequiredService<IPdfDocumentRepository>();
                var storage = scope.ServiceProvider.GetRequiredService<IPdfStorage>();

                await RunRecoveryIterationAsync(repository, storage, stoppingToken);
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogError(ex, "Lỗi xảy ra trong quá trình quét thu hồi lease PDF.");
            }

            try
            {
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }

        _logger.LogInformation("PdfDocumentRecoveryService đang dừng.");
    }

    public async Task RunRecoveryIterationAsync(
        IPdfDocumentRepository repository,
        IPdfStorage storage,
        CancellationToken ct = default)
    {
        // 1. Process expired processing leases
        var expiredDocs = await repository.GetExpiredProcessingLeasesAsync(DateTime.UtcNow, 20, ct);
        foreach (var doc in expiredDocs)
        {
            _logger.LogWarning("Phát hiện lease xuất PDF hết hạn cho tài liệu {DocumentId} (StoragePublicId: {StoragePublicId}).", doc.PublicId, doc.StoragePublicId);

            var markedFailed = await repository.FencedFinalizeFailedAsync(
                doc.PublicId,
                doc.LeaseToken ?? Guid.Empty,
                "LEASE_EXPIRED",
                storageCleanupRequired: true,
                DateTime.UtcNow,
                ct);

            if (markedFailed && !string.IsNullOrWhiteSpace(doc.StoragePublicId))
            {
                await CleanupStorageAsync(repository, storage, doc.PublicId, doc.StoragePublicId, ct);
            }
        }

        // 2. Retry pending storage cleanups for failed documents
        var cleanupDocs = await repository.GetDocumentsNeedingStorageCleanupAsync(20, ct);
        foreach (var doc in cleanupDocs)
        {
            if (!string.IsNullOrWhiteSpace(doc.StoragePublicId))
            {
                await CleanupStorageAsync(repository, storage, doc.PublicId, doc.StoragePublicId, ct);
            }
        }
    }

    private async Task CleanupStorageAsync(
        IPdfDocumentRepository repository,
        IPdfStorage storage,
        Guid publicId,
        string storagePublicId,
        CancellationToken ct)
    {
        try
        {
            await storage.DestroyAsync(storagePublicId, ct);
            await repository.ClearStorageCleanupRequiredAsync(publicId, ct);
            _logger.LogInformation("Đã dọn dẹp orphan asset Cloudinary thành công cho tài liệu {DocumentId}.", publicId);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception cleanupEx)
        {
            _logger.LogWarning(cleanupEx, "Lỗi dọn dẹp storage Cloudinary {StoragePublicId} cho tài liệu {DocumentId}. Marker sẽ được giữ để retry sau.", storagePublicId, publicId);
        }
    }
}
