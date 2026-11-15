using Microsoft.Extensions.Logging;
using RecipeHub.BuildingBlocks.Events;

namespace RecipeHub.BuildingBlocks.Audit;

public sealed class CompositeAuditActivityPublisher : IAuditActivityPublisher
{
    private readonly IReadOnlyList<IAuditActivityPublisher> _publishers;
    private readonly ILogger<CompositeAuditActivityPublisher> _logger;

    public CompositeAuditActivityPublisher(IEnumerable<IAuditActivityPublisher> publishers,
        ILogger<CompositeAuditActivityPublisher> logger)
    {
        _publishers = publishers.ToArray();
        _logger = logger;
    }

    public async Task PublishAsync(string source, AuditActivityEvent activity, CancellationToken cancellationToken = default)
    {
        var envelope = AuditEnvelopeFactory.Create(source, activity);
        foreach (var publisher in _publishers)
        {
            try
            {
                if (publisher is IAuditEnvelopePublisher transport)
                    await transport.PublishEnvelopeAsync(envelope, cancellationToken);
                else
                    await publisher.PublishAsync(source, activity, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Audit transport failed for {EventId} [{Action}]", envelope.EventId, activity.Action);
            }
        }
    }
}
