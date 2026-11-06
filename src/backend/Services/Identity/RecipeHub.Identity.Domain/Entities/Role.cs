namespace RecipeHub.Identity.Domain.Entities;

public sealed class Role
{
    public short Id { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<IdentityUser> Users { get; set; } = [];
}
