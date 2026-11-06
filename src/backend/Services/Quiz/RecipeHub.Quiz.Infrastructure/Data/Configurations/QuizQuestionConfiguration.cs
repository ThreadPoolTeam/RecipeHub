using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RecipeHub.Quiz.Domain.Entities;

namespace RecipeHub.Quiz.Infrastructure.Data.Configurations;

public class QuizQuestionConfiguration : IEntityTypeConfiguration<QuizQuestion>
{
    public void Configure(EntityTypeBuilder<QuizQuestion> builder)
    {
        builder.ToTable("quiz_question", "quiz_db", t =>
        {
            t.HasCheckConstraint("quiz_question_sort_order_check", "sort_order > 0");
            t.HasCheckConstraint("quiz_question_content_check", "length(btrim(content)) > 0");
        });

        builder.HasKey(e => e.Id).HasName("quiz_question_pkey");
        builder.Property(e => e.Id)
            .HasColumnName("id")
            .UseIdentityByDefaultColumn();

        builder.Property(e => e.QuizVersionId)
            .HasColumnName("quiz_version_id")
            .IsRequired();
        builder.HasIndex(e => new { e.QuizVersionId, e.SortOrder }, "quiz_question_version_order_idx");

        builder.Property(e => e.SortOrder)
            .HasColumnName("sort_order")
            .HasDefaultValue(1)
            .IsRequired();

        builder.Property(e => e.Content)
            .HasColumnName("content")
            .IsRequired();

        builder.Property(e => e.Explanation)
            .HasColumnName("explanation");

        builder.HasOne(e => e.QuizVersion)
            .WithMany(v => v.Questions)
            .HasForeignKey(e => e.QuizVersionId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("fk_quiz_question_version");

        builder.HasMany(e => e.Options)
            .WithOne(o => o.Question)
            .HasForeignKey(o => o.QuestionId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("fk_quiz_option_question");
    }
}
