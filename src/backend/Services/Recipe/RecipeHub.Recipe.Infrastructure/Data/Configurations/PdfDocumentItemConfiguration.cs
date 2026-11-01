using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RecipeHub.Recipe.Domain.Entities;

namespace RecipeHub.Recipe.Infrastructure.Data.Configurations;

public class PdfDocumentItemConfiguration : IEntityTypeConfiguration<PdfDocumentItem>
{
    public void Configure(EntityTypeBuilder<PdfDocumentItem> builder)
    {
        builder.ToTable("pdf_document_item", "recipe_db", tb =>
            tb.HasComment("Các công thức thành phần trong một tài liệu PDF xuất bản, kèm snapshot dữ liệu."));

        builder.HasKey(e => e.Id).HasName("pdf_document_item_pkey");
        builder.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();

        builder.Property(e => e.DocumentId).HasColumnName("document_id").IsRequired();
        builder.Property(e => e.RecipeVersionId).HasColumnName("recipe_version_id").IsRequired();
        builder.Property(e => e.SortOrder).HasColumnName("sort_order").IsRequired();

        builder.Property(e => e.SourceSnapshot)
            .HasColumnName("source_snapshot")
            .HasColumnType("jsonb")
            .IsRequired();

        builder.HasIndex(e => new { e.DocumentId, e.SortOrder }, "pdf_document_item_doc_sort_order_key").IsUnique();
        builder.HasIndex(e => new { e.DocumentId, e.RecipeVersionId }, "pdf_document_item_doc_recipe_version_key").IsUnique();
        builder.HasIndex(e => e.RecipeVersionId, "pdf_document_item_version_idx");

        builder.HasOne(e => e.Document)
            .WithMany(d => d.Items)
            .HasForeignKey(e => e.DocumentId)
            .HasConstraintName("pdf_document_item_document_fk")
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.RecipeVersion)
            .WithMany()
            .HasForeignKey(e => e.RecipeVersionId)
            .HasConstraintName("pdf_document_item_recipe_version_fk")
            .OnDelete(DeleteBehavior.Restrict);
    }
}
