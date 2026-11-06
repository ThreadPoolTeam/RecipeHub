using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RecipeHub.Content.Application.Interfaces;
using RecipeHub.Content.Domain;
using RecipeHub.Content.Infrastructure.Data;

namespace RecipeHub.BackgroundWorker;

public sealed class ContentDraftCleanupWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ContentDraftCleanupWorker> _logger;
    private readonly TimeSpan _pollInterval = TimeSpan.FromSeconds(30);

    public ContentDraftCleanupWorker(
        IServiceProvider serviceProvider,
        ILogger<ContentDraftCleanupWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ContentDraftCleanupWorker started, running every {Interval}s.", _pollInterval.TotalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunCleanupCycleAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in ContentDraftCleanupWorker cycle.");
            }

            try
            {
                await Task.Delay(_pollInterval, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }

        _logger.LogInformation("ContentDraftCleanupWorker stopped.");
    }

    private async Task RunCleanupCycleAsync(CancellationToken ct)
    {
        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ContentDbContext>();
        var tempStore = scope.ServiceProvider.GetRequiredService<ITemporaryImageStore>();

        var now = DateTimeOffset.UtcNow;

        // 1. Lọc các draft cần dọn file:
        // - Có File record (d.File != null)
        // - Trạng thái terminal (accepted, discarded, expired) HOẶC generated đã quá hạn
        // - AN TOÀN LEASE: Không dọn khi đang accepting (state == accepting) hoặc lease còn hiệu lực (lease_expires_at > now)
        var candidates = await dbContext.AiImageDrafts
            .Include(d => d.File)
            .Where(d => d.File != null &&
                (
                    d.State == AiImageDraft.StateAccepted ||
                    d.State == AiImageDraft.StateDiscarded ||
                    d.State == AiImageDraft.StateExpired ||
                    (d.State == AiImageDraft.StateGenerated && d.ExpiresAt != null && d.ExpiresAt <= now)
                ) &&
                (d.State != AiImageDraft.StateAccepting && (d.LeaseExpiresAt == null || d.LeaseExpiresAt <= now)))
            .OrderBy(d => d.CreatedAt)
            .Take(50)
            .ToListAsync(ct);

        if (candidates.Count == 0)
        {
            return;
        }

        _logger.LogInformation("ContentDraftCleanupWorker: found {Count} draft(s) pending file cleanup.", candidates.Count);

        int cleanedCount = 0;
        foreach (var draft in candidates)
        {
            if (draft.State == AiImageDraft.StateGenerated)
            {
                draft.MarkExpired();
            }

            if (draft.File != null)
            {
                var file = draft.File;
                var path = file.TemporaryImagePath;
                bool fileCleared = false;

                try
                {
                    if (tempStore.Exists(path))
                    {
                        await tempStore.DeleteAsync(path, ct);
                    }
                    // Tệp vật lý đã xóa HOẶC vốn không còn tồn tại trên đĩa (idempotent)
                    fileCleared = true;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to delete temporary image {Path} for draft {DraftId}. Retrying next cycle.", path, draft.PublicId);
                }

                if (fileCleared)
                {
                    dbContext.AiImageDraftFiles.Remove(file);
                    draft.RemoveFile();
                    cleanedCount++;
                }
            }
        }

        if (cleanedCount > 0 || candidates.Any(c => c.State == AiImageDraft.StateExpired))
        {
            await dbContext.SaveChangesAsync(ct);
            _logger.LogInformation("ContentDraftCleanupWorker: successfully cleaned up files for {Count} draft(s).", cleanedCount);
        }
    }
}
