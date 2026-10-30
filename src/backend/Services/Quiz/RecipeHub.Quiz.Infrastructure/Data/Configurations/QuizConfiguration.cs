using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace RecipeHub.Quiz.Infrastructure.Data.Configurations;

public class QuizConfiguration : IEntityTypeConfiguration<Domain.Entities.Quiz>
{
    public void Configure(EntityTypeBuilder<Domain.Entities.Quiz> builder)
    {
        builder.ToTable("quiz", "quiz_db", t =>
        {
            t.HasCheckConstraint("quiz_code_check", "length(btrim(code)) > 0");
            t.HasCheckConstraint("quiz_title_check", "length(btrim(title)) > 0");
            t.HasCheckConstraint("quiz_next_version_number_check", "next_version_number > 0");
        });

        builder.HasKey(e => e.Id).HasName("quiz_pkey");
        builder.Property(e => e.Id)
            .HasColumnName("id")
            .UseIdentityByDefaultColumn();

        builder.Property(e => e.PublicId)
            .HasColumnName("public_id")
            .IsRequired();
        builder.HasIndex(e => e.PublicId, "quiz_public_id_key").IsUnique();

        builder.Property(e => e.Code)
            .HasColumnName("code")
            .IsRequired();
        builder.HasIndex(e => e.Code, "quiz_code_key").IsUnique();

        builder.Property(e => e.Title)
            .HasColumnName("title")
            .IsRequired();

        builder.Property(e => e.Description)
            .HasColumnName("description");

        builder.Property(e => e.CreatedByUserRef)
            .HasColumnName("created_by_user_ref")
            .IsRequired();

        builder.Property(e => e.NextVersionNumber)
            .HasColumnName("next_version_number")
            .HasDefaultValue(1)
            .IsRequired();

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at")
            .HasDefaultValueSql("now()")
            .IsRequired();

        builder.Property(e => e.UpdatedAt)
            .HasColumnName("updated_at")
            .HasDefaultValueSql("now()")
            .IsRequired();

        builder.HasMany(e => e.Versions)
            .WithOne(v => v.Quiz)
            .HasForeignKey(v => v.QuizId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("fk_quiz_version_quiz");
    }
}
