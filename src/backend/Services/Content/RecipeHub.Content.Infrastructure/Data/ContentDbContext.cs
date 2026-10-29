using Microsoft.EntityFrameworkCore;
using RecipeHub.Content.Domain;

namespace RecipeHub.Content.Infrastructure.Data;

public sealed class ContentDbContext : DbContext
{
    public const string Schema = "content_db";

    public ContentDbContext(DbContextOptions<ContentDbContext> options) : base(options) { }

    public DbSet<AiImageDraft> AiImageDrafts => Set<AiImageDraft>();
    public DbSet<MediaAsset> MediaAssets => Set<MediaAsset>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema(Schema);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ContentDbContext).Assembly);
    }
}
