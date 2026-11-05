using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RecipeHub.Recipe.Domain.Entities;

namespace RecipeHub.Recipe.Infrastructure.Data.Configurations;

public class PdfDocumentStorageConfiguration : IEntityTypeConfiguration<PdfDocumentStorage>
{
    public void Configure(EntityTypeBuilder<PdfDocumentStorage> builder)
    {
        builder.ToTable("pdf_document_storage", "recipe_db", tb =>
            tb.HasComment("Thông tin kỹ thuật và vị trí file của PDF document (Cloudinary raw/authenticated). Quan hệ 1-1 với pdf_document."));

        builder.HasKey(e => e.DocumentId).HasName("pdf_document_storage_pkey");
        builder.Property(e => e.DocumentId).HasColumnName("document_id").ValueGeneratedNever();

        builder.Property(e => e.Provider).HasColumnName("provider").HasDefaultValue("Cloudinary").IsRequired();
        builder.Property(e => e.StoragePublicId).HasColumnName("storage_public_id").IsRequired();
        builder.HasIndex(e => e.StoragePublicId, "pdf_document_storage_public_id_key").IsUnique();

        builder.Property(e => e.StorageAssetId).HasColumnName("storage_asset_id");
        builder.Property(e => e.StorageVersion).HasColumnName("storage_version");
        builder.Property(e => e.FileName).HasColumnName("file_name").IsRequired();
        builder.Property(e => e.ByteSize).HasColumnName("byte_size");
        builder.Property(e => e.FileSha256).HasColumnName("file_sha256");
        builder.Property(e => e.CleanupRequired).HasColumnName("cleanup_required").HasDefaultValue(false).IsRequired();

        builder.HasIndex(e => e.DocumentId, "pdf_document_storage_cleanup_idx")
            .HasFilter("cleanup_required = true");

        builder.HasOne(e => e.Document)
            .WithOne(d => d.Storage)
            .HasForeignKey<PdfDocumentStorage>(e => e.DocumentId)
            .HasConstraintName("pdf_document_storage_document_fk")
            .OnDelete(DeleteBehavior.Restrict);
    }
}
