using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RecipeHub.Recipe.Domain.Entities;

namespace RecipeHub.Recipe.Infrastructure.Data.Configurations;

public class PdfDocumentConfiguration : IEntityTypeConfiguration<PdfDocument>
{
    public void Configure(EntityTypeBuilder<PdfDocument> builder)
    {
        builder.ToTable("pdf_document", "recipe_db", tb =>
            tb.HasComment("Lưu trữ tài liệu PDF công thức đã xuất (bản nháp hoặc chính thức, đơn lẻ hoặc bộ sưu tập)."));

        builder.HasKey(e => e.Id).HasName("pdf_document_pkey");
        builder.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();

        builder.Property(e => e.PublicId).HasColumnName("public_id").IsRequired();
        builder.HasIndex(e => e.PublicId, "pdf_document_public_id_key").IsUnique();

        builder.Property(e => e.Title).HasColumnName("title").IsRequired();
        builder.Property(e => e.DocumentType).HasColumnName("document_type").IsRequired();
        builder.Property(e => e.ExportScope).HasColumnName("export_scope").IsRequired();
        builder.Property(e => e.State).HasColumnName("state").IsRequired();

        builder.Property(e => e.CreatedByUserRef).HasColumnName("created_by_user_ref").IsRequired();
        builder.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()").IsRequired();
        builder.Property(e => e.CompletedAt).HasColumnName("completed_at");

        builder.Property(e => e.LeaseToken).HasColumnName("lease_token");
        builder.Property(e => e.LeaseExpiresAt).HasColumnName("lease_expires_at");
        builder.Property(e => e.ErrorCode).HasColumnName("error_code");

        builder.HasIndex(e => new { e.CreatedAt, e.Id }, "pdf_document_history_idx");
        builder.HasIndex(e => new { e.CreatedByUserRef, e.CreatedAt }, "pdf_document_user_history_idx");
        builder.HasIndex(e => e.LeaseExpiresAt, "pdf_document_processing_lease_idx")
            .HasFilter("state = 'processing'");

        builder.HasOne(e => e.Storage)
            .WithOne(s => s.Document)
            .HasForeignKey<PdfDocumentStorage>(s => s.DocumentId)
            .HasConstraintName("pdf_document_storage_document_fk")
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(e => e.Items)
            .WithOne(i => i.Document)
            .HasForeignKey(i => i.DocumentId)
            .HasConstraintName("pdf_document_item_document_fk")
            .OnDelete(DeleteBehavior.Restrict);
    }
}
