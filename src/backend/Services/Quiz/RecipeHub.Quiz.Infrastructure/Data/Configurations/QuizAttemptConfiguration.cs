using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RecipeHub.Quiz.Domain.Entities;

namespace RecipeHub.Quiz.Infrastructure.Data.Configurations;

public class QuizAttemptConfiguration : IEntityTypeConfiguration<QuizAttempt>
{
    public void Configure(EntityTypeBuilder<QuizAttempt> builder)
    {
        builder.ToTable("quiz_attempt", "quiz_db", t =>
        {
            t.HasCheckConstraint("quiz_attempt_state_check", "state IN ('in_progress', 'submitted')");
            t.HasCheckConstraint("quiz_attempt_submission_check", "((state = 'in_progress' AND score IS NULL AND submitted_at IS NULL AND is_passed IS NULL) OR (state = 'submitted' AND score IS NOT NULL AND submitted_at IS NOT NULL AND is_passed IS NOT NULL AND submitted_at >= started_at))");
            t.HasCheckConstraint("quiz_attempt_score_range_check", "score IS NULL OR (score >= 0.0 AND score <= 100.0)");
        });

        builder.HasKey(e => e.Id).HasName("quiz_attempt_pkey");
        builder.Property(e => e.Id)
            .HasColumnName("id")
            .UseIdentityByDefaultColumn();

        builder.Property(e => e.PublicId)
            .HasColumnName("public_id")
            .IsRequired();
        builder.HasIndex(e => e.PublicId, "quiz_attempt_public_id_key").IsUnique();

        builder.Property(e => e.QuizVersionId)
            .HasColumnName("quiz_version_id")
            .IsRequired();

        builder.Property(e => e.UserRef)
            .HasColumnName("user_ref")
            .IsRequired();
        builder.HasIndex(e => new { e.UserRef, e.QuizVersionId }, "quiz_attempt_user_version_idx");

        // Partial unique index for concurrent/duplicate attempt protection
        builder.HasIndex(e => new { e.UserRef, e.QuizVersionId }, "quiz_attempt_in_progress_uidx")
            .HasFilter("state = 'in_progress'")
            .IsUnique();

        builder.Property(e => e.State)
            .HasColumnName("state")
            .HasDefaultValue("in_progress")
            .IsRequired();
        builder.HasIndex(e => e.State, "quiz_attempt_state_idx");

        builder.Property(e => e.Score)
            .HasColumnName("score")
            .HasPrecision(5, 2);

        builder.Property(e => e.IsPassed)
            .HasColumnName("is_passed");

        builder.Property(e => e.StartedAt)
            .HasColumnName("started_at")
            .HasDefaultValueSql("now()")
            .IsRequired();

        builder.Property(e => e.SubmittedAt)
            .HasColumnName("submitted_at");

        builder.HasOne(e => e.QuizVersion)
            .WithMany(v => v.Attempts)
            .HasForeignKey(e => e.QuizVersionId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("fk_quiz_attempt_version");

        builder.HasMany(e => e.Answers)
            .WithOne(a => a.Attempt)
            .HasForeignKey(a => a.AttemptId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("fk_quiz_answer_attempt");
    }
}
