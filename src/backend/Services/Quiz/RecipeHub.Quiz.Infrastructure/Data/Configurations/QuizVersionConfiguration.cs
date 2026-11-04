using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RecipeHub.Quiz.Domain.Entities;

namespace RecipeHub.Quiz.Infrastructure.Data.Configurations;

public class QuizVersionConfiguration : IEntityTypeConfiguration<QuizVersion>
{
    public void Configure(EntityTypeBuilder<QuizVersion> builder)
    {
        builder.ToTable("quiz_version", "quiz_db", t =>
        {
            t.HasCheckConstraint("quiz_version_number_check", "version_number > 0");
            t.HasCheckConstraint("quiz_version_passing_score_check", "passing_score > 0 AND passing_score <= 100");
            t.HasCheckConstraint("quiz_version_state_check", "state IN ('draft', 'published', 'archived')");
            t.HasCheckConstraint("quiz_version_published_check", "((state = 'draft' AND published_at IS NULL) OR (state IN ('published', 'archived') AND published_at IS NOT NULL))");
        });

        builder.HasKey(e => e.Id).HasName("quiz_version_pkey");
        builder.Property(e => e.Id)
            .HasColumnName("id")
            .UseIdentityByDefaultColumn();

        builder.Property(e => e.PublicId)
            .HasColumnName("public_id")
            .IsRequired();
        builder.HasIndex(e => e.PublicId, "quiz_version_public_id_key").IsUnique();

        builder.Property(e => e.QuizId)
            .HasColumnName("quiz_id")
            .IsRequired();

        builder.Property(e => e.VersionNumber)
            .HasColumnName("version_number")
            .HasDefaultValue(1)
            .IsRequired();
        builder.HasIndex(e => new { e.QuizId, e.VersionNumber }, "quiz_version_number_uidx").IsUnique();

        builder.Property(e => e.RecipeVersionRef)
            .HasColumnName("recipe_version_ref")
            .IsRequired();
        builder.HasIndex(e => e.RecipeVersionRef, "quiz_version_recipe_ref_idx");

        builder.Property(e => e.PassingScore)
            .HasColumnName("passing_score")
            .HasPrecision(5, 2)
            .HasDefaultValue(80.0m)
            .IsRequired();

        builder.Property(e => e.State)
            .HasColumnName("state")
            .HasDefaultValue("draft")
            .IsRequired();
        builder.HasIndex(e => e.State, "quiz_version_state_idx");

        builder.Property(e => e.CreatedByUserRef)
            .HasColumnName("created_by_user_ref")
            .IsRequired();

        builder.Property(e => e.PublishedAt)
            .HasColumnName("published_at");

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at")
            .HasDefaultValueSql("now()")
            .IsRequired();

        builder.Property(e => e.UpdatedAt)
            .HasColumnName("updated_at")
            .HasDefaultValueSql("now()")
            .IsRequired();

        builder.HasOne(e => e.Quiz)
            .WithMany(q => q.Versions)
            .HasForeignKey(e => e.QuizId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("fk_quiz_version_quiz");

        builder.HasMany(e => e.Questions)
            .WithOne(q => q.QuizVersion)
            .HasForeignKey(q => q.QuizVersionId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("fk_quiz_question_version");

        builder.HasMany(e => e.Attempts)
            .WithOne(a => a.QuizVersion)
            .HasForeignKey(a => a.QuizVersionId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("fk_quiz_attempt_version");
    }
}
