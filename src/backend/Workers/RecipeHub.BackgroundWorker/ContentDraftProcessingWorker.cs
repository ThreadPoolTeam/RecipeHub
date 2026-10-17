using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RecipeHub.Content.Application.Interfaces;
using RecipeHub.Content.Domain;
using RecipeHub.Content.Infrastructure.Persistence;
using StackExchange.Redis;

namespace RecipeHub.BackgroundWorker;

public sealed class ContentDraftProcessingWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ContentDraftProcessingWorker> _logger;

    private const string DefaultStreamName = "content.image-drafts.v1";
    private const string GroupName = "content-draft-workers";
    private readonly string _consumerName = $"worker-{Environment.MachineName}-{Guid.NewGuid():N}"[..24];

    public ContentDraftProcessingWorker(
        IServiceProvider serviceProvider,
        IConfiguration configuration,
        ILogger<ContentDraftProcessingWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _configuration = configuration;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var streamName = _configuration["Redis:DraftsStream"] ?? DefaultStreamName;
        var redisConn = _configuration.GetConnectionString("Redis") ?? "localhost:6379";

        _logger.LogInformation("ContentDraftProcessingWorker connecting to Redis at {RedisConn}", redisConn);

        IConnectionMultiplexer? multiplexer = null;
        while (!stoppingToken.IsCancellationRequested && multiplexer == null)
        {
            try
            {
                multiplexer = await ConnectionMultiplexer.ConnectAsync(redisConn);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("ContentDraftProcessingWorker failed to connect to Redis ({Message}). Retrying in 5s...", ex.Message);
                try { await Task.Delay(5000, stoppingToken); } catch (OperationCanceledException) { return; }
            }
        }

        if (multiplexer == null || stoppingToken.IsCancellationRequested) return;

        var db = multiplexer.GetDatabase();

        // Ensure stream and group exist
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await db.StreamCreateConsumerGroupAsync(streamName, GroupName, "$", createStream: true);
                _logger.LogInformation("Stream {StreamName} and consumer group {GroupName} initialized.", streamName, GroupName);
                break;
            }
            catch (RedisServerException ex) when (ex.Message.Contains("BUSYGROUP"))
            {
                _logger.LogInformation("Consumer group {GroupName} already exists for {StreamName}.", GroupName, streamName);
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Retrying stream group init: {Message}", ex.Message);
                try { await Task.Delay(3000, stoppingToken); } catch (OperationCanceledException) { return; }
            }
        }

        _logger.LogInformation("ContentDraftProcessingWorker active and listening on {StreamName}...", streamName);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var messages = await db.StreamReadGroupAsync(
                    streamName,
                    GroupName,
                    _consumerName,
                    ">",
                    count: 1);

                if (messages == null || messages.Length == 0)
                {
                    await Task.Delay(1000, stoppingToken);
                    continue;
                }

                foreach (var message in messages)
                {
                    await ProcessStreamMessageAsync(message, db, streamName, stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reading from Redis Stream {StreamName}", streamName);
                try { await Task.Delay(2000, stoppingToken); } catch (OperationCanceledException) { break; }
            }
        }
    }

    private async Task ProcessStreamMessageAsync(
        StreamEntry message,
        IDatabase db,
        string streamName,
        CancellationToken ct)
    {
        string? payloadJson = null;
        foreach (var entry in message.Values)
        {
            if (entry.Name == "payload")
            {
                payloadJson = entry.Value;
                break;
            }
        }

        if (string.IsNullOrWhiteSpace(payloadJson))
        {
            _logger.LogWarning("Message {Id} has empty payload. Acknowledging.", message.Id);
            await db.StreamAcknowledgeAsync(streamName, GroupName, message.Id);
            return;
        }

        Guid draftId = Guid.Empty;
        try
        {
            using var doc = JsonDocument.Parse(payloadJson);
            if (doc.RootElement.TryGetProperty("DraftId", out var draftIdProp))
            {
                Guid.TryParse(draftIdProp.GetString(), out draftId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse draft payload JSON for message {Id}", message.Id);
            await db.StreamAcknowledgeAsync(streamName, GroupName, message.Id);
            return;
        }

        if (draftId == Guid.Empty)
        {
            _logger.LogWarning("Invalid or missing DraftId in message {Id}. Acknowledging.", message.Id);
            await db.StreamAcknowledgeAsync(streamName, GroupName, message.Id);
            return;
        }

        _logger.LogInformation("Processing image draft job {DraftId} from Redis message {MessageId}", draftId, message.Id);

        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ContentDbContext>();
        var translator = scope.ServiceProvider.GetRequiredService<IAiImagePromptTranslator>();
        var generator = scope.ServiceProvider.GetRequiredService<IAiImageGenerator>();
        var tempStore = scope.ServiceProvider.GetRequiredService<ITemporaryImageStore>();

        var draft = await dbContext.AiImageDrafts.FirstOrDefaultAsync(d => d.PublicId == draftId, ct);
        if (draft == null)
        {
            _logger.LogWarning("Draft {DraftId} not found in database. Acknowledging message.", draftId);
            await db.StreamAcknowledgeAsync(streamName, GroupName, message.Id);
            return;
        }

        if (draft.State != AiImageDraft.StateQueued && draft.State != AiImageDraft.StateProcessing)
        {
            _logger.LogInformation("Draft {DraftId} already in '{State}' state. Skipping.", draftId, draft.State);
            await db.StreamAcknowledgeAsync(streamName, GroupName, message.Id);
            return;
        }

        var leaseToken = Guid.NewGuid();
        draft.StartProcessing(leaseToken, TimeSpan.FromMinutes(5));
        await dbContext.SaveChangesAsync(ct);

        try
        {
            // 1. Translate and build prompt via LLM (Gemini)
            _logger.LogInformation("Calling AI prompt translator for draft {DraftId}", draftId);
            var englishPrompt = await translator.TranslateAndBuildPromptAsync(draft.InputSnapshot, draft.UserBrief, ct);

            // 2. Generate image via FLUX.1 Schnell
            _logger.LogInformation("Calling image generator for draft {DraftId}", draftId);
            var generatedImage = await generator.GenerateImageAsync(englishPrompt, ct);

            // 3. Save binary image to shared temporary storage
            var extension = generatedImage.MimeType.Contains("jpeg") || generatedImage.MimeType.Contains("jpg") ? ".jpg" : ".png";
            var relativePath = await tempStore.SaveTemporaryImageAsync(draft.PublicId, generatedImage.ImageBytes, extension, ct);

            // 4. Mark draft as generated (30-minute expiration)
            draft.MarkGenerated(
                englishPrompt,
                relativePath,
                generatedImage.MimeType,
                generatedImage.ImageBytes.Length,
                generatedImage.Width,
                generatedImage.Height,
                TimeSpan.FromMinutes(30));

            await dbContext.SaveChangesAsync(ct);
            _logger.LogInformation("Draft {DraftId} successfully generated and saved to {Path}", draftId, relativePath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate image for draft {DraftId}", draftId);
            draft.MarkFailed("GENERATION_FAILED", ex.Message);
            try
            {
                await dbContext.SaveChangesAsync(CancellationToken.None);
            }
            catch (Exception saveEx)
            {
                _logger.LogError(saveEx, "Failed to update draft state to failed for {DraftId}", draftId);
            }
        }
        finally
        {
            await db.StreamAcknowledgeAsync(streamName, GroupName, message.Id);
        }
    }
}
