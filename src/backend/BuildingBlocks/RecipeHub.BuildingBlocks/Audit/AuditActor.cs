namespace RecipeHub.BuildingBlocks.Audit;

public sealed record AuditActor(
    Guid Id,
    string Name,
    string Role
)
{
    public void EnsureValid()
    {
        if (Id == Guid.Empty)
        {
            throw new UnauthorizedAccessException("Audit actor ID is missing or invalid.");
        }
    }
}
