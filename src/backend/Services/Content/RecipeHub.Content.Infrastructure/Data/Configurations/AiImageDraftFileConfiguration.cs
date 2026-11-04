using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RecipeHub.Content.Domain;
using RecipeHub.Content.Infrastructure.Data;

namespace RecipeHub.Content.Infrastructure.Data.Configurations;

public sealed class AiImageDraftFileConfiguration : IEntityTypeConfiguration<AiImageDraftFile>
{
    public void Configure(EntityTypeBuilder<AiImageDraftFile> builder)
    {
        builder.ToTable("ai_image_draft_file", ContentDbContext.Schema);

        builder.HasKey(e => e.DraftId);
        builder.Property(e => e.DraftId)
            .HasColumnName("draft_id")
            .ValueGeneratedNever();

        builder.Property(e => e.TemporaryImagePath)
            .HasColumnName("temporary_image_path")
            .IsRequired();

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

        builder.ToTable(t =>
        {
            t.HasCheckConstraint(
                "ai_image_draft_file_byte_size_check",
                "byte_size > 0");

            t.HasCheckConstraint(
                "ai_image_draft_file_dimensions_check",
                "width > 0 AND height > 0");

            t.HasCheckConstraint(
                "ai_image_draft_file_path_check",
                "length(trim(temporary_image_path)) > 0");

            t.HasCheckConstraint(
                "ai_image_draft_file_mime_check",
                "length(trim(mime_type)) > 0");
        });
    }
}
