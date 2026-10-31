using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RecipeHub.Quiz.Domain.Entities;

namespace RecipeHub.Quiz.Infrastructure.Data.Configurations;

public class QuizAnswerConfiguration : IEntityTypeConfiguration<QuizAnswer>
{
    public void Configure(EntityTypeBuilder<QuizAnswer> builder)
    {
        builder.ToTable("quiz_answer", "quiz_db");

        builder.HasKey(e => e.Id).HasName("quiz_answer_pkey");
        builder.Property(e => e.Id)
            .HasColumnName("id")
            .UseIdentityByDefaultColumn();

        builder.Property(e => e.AttemptId)
            .HasColumnName("attempt_id")
            .IsRequired();

        builder.Property(e => e.QuestionId)
            .HasColumnName("question_id")
            .IsRequired();

        builder.HasIndex(e => new { e.AttemptId, e.QuestionId }, "quiz_answer_attempt_question_uidx").IsUnique();

        builder.Property(e => e.SelectedOptionId)
            .HasColumnName("selected_option_id");
        builder.HasIndex(e => e.SelectedOptionId, "quiz_answer_option_idx");

        builder.HasOne(e => e.Attempt)
            .WithMany(a => a.Answers)
            .HasForeignKey(e => e.AttemptId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("fk_quiz_answer_attempt");

        builder.HasOne(e => e.Question)
            .WithMany()
            .HasForeignKey(e => e.QuestionId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("fk_quiz_answer_question");

        builder.HasOne(e => e.SelectedOption)
            .WithMany()
            .HasForeignKey(e => e.SelectedOptionId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("fk_quiz_answer_option");
    }
}
