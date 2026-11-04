using RecipeHub.BuildingBlocks.Events;

namespace RecipeHub.BuildingBlocks.Audit;

public sealed class NullAuditActivityPublisher : IAuditActivityPublisher
{
    public static readonly NullAuditActivityPublisher Instance = new();

    public Task PublishAsync(string source, AuditActivityEvent activity, CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }
}
