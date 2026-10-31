using RecipeHub.BuildingBlocks.Events;

namespace RecipeHub.BuildingBlocks.Audit;

public interface IAuditActivityPublisher
{
    Task PublishAsync(
        string source,
        AuditActivityEvent activity,
        CancellationToken cancellationToken = default
    );
}
