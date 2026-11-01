namespace RecipeHub.BuildingBlocks.Events;

public sealed record AuditActivityEvent(
    Guid ActorId,
    string ActorName,
    string ActorRole,
    string Action,
    string TargetType,
    Guid TargetId,
    string Summary
)
{
    public const string StreamName = "audit.activities.v1";
    public const string ConsumerGroup = "recipehub-audit";
    public const string EventTypeName = "Audit.ActivityRecorded.v1";
    public const string CurrentSchemaVersion = "1.0";
}
