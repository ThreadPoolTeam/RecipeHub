namespace RecipeHub.Audit.Domain.Entities;

public class AuditLog
{
    public Guid Id { get; set; }
    public Guid ActorId { get; set; }
    public string ActorName { get; set; } = string.Empty;
    public string ActorRole { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string TargetType { get; set; } = string.Empty;
    public Guid TargetId { get; set; }
    public string Summary { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; }
}
