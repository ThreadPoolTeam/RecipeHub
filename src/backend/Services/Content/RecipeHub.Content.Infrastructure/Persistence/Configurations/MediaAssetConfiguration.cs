using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RecipeHub.Content.Domain;

namespace RecipeHub.Content.Infrastructure.Persistence.Configurations;

public sealed class MediaAssetConfiguration : IEntityTypeConfiguration<MediaAsset>
{
    public void Configure(EntityTypeBuilder<MediaAsset> builder)
    {
        builder.ToTable("media_asset", ContentDbContext.Schema);

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id)
            .HasColumnName("id")
            .UseIdentityByDefaultColumn();

        builder.Property(e => e.PublicId)
            .HasColumnName("public_id")
            .IsRequired();
        builder.HasIndex(e => e.PublicId)
            .IsUnique();

        builder.Property(e => e.AiImageDraftId)
            .HasColumnName("ai_image_draft_id");
        builder.HasIndex(e => e.AiImageDraftId)
            .IsUnique();

        builder.Property(e => e.StorageProvider)
            .HasColumnName("storage_provider")
            .HasDefaultValue(MediaAsset.DefaultStorageProvider)
            .IsRequired();

        builder.Property(e => e.ProviderPublicId)
            .HasColumnName("provider_public_id")
            .IsRequired();

        builder.Property(e => e.DeliveryUrl)
            .HasColumnName("delivery_url")
            .IsRequired();

        builder.Property(e => e.OriginalFileName)
            .HasColumnName("original_file_name");

        builder.Property(e => e.MimeType)
            .HasColumnName("mime_type")
            .IsRequired();

        builder.Property(e => e.ByteSize)
            .HasColumnName("byte_size")
            .IsRequired();

        builder.Property(e => e.Width)
            .HasColumnName("width")
            .IsRequired();

        builder.Property(e => e.Height)
            .HasColumnName("height")
            .IsRequired();

        builder.Property(e => e.SourceType)
            .HasColumnName("source_type")
            .IsRequired();

        builder.Property(e => e.State)
            .HasColumnName("state")
            .HasDefaultValue(MediaAsset.StateActive)
            .IsRequired();

        builder.Property(e => e.CreatedByUserRef)
            .HasColumnName("created_by_user_ref")
            .IsRequired();

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at")
            .HasDefaultValueSql("now()")
            .IsRequired();

        // Foreign Key
        builder.HasOne(e => e.AiImageDraft)
            .WithOne()
            .HasForeignKey<MediaAsset>(e => e.AiImageDraftId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("media_asset_ai_draft");

        // Indexes
        builder.HasIndex(e => new { e.StorageProvider, e.ProviderPublicId })
            .IsUnique()
            .HasDatabaseName("media_asset_provider_public_id_uidx");

        builder.HasIndex(e => new { e.SourceType, e.State, e.CreatedAt })
            .HasDatabaseName("media_asset_library_idx");

        builder.HasIndex(e => e.CreatedByUserRef)
            .HasDatabaseName("media_asset_creator_idx");

        // Checks
        builder.ToTable(t =>
        {
            t.HasCheckConstraint("media_asset_byte_size_check", "byte_size > 0");
            t.HasCheckConstraint("media_asset_dimensions_check", "width > 0 AND height > 0");
            t.HasCheckConstraint("media_asset_source_type_check", "source_type IN ('real', 'ai_illustration')");
            t.HasCheckConstraint("media_asset_state_check", "state = 'active'");
            t.HasCheckConstraint(
                "media_asset_ai_origin_check",
                "(source_type = 'real' AND ai_image_draft_id IS NULL) OR (source_type = 'ai_illustration' AND ai_image_draft_id IS NOT NULL)");
        });
    }
}
