using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RecipeHub.Quiz.Domain.Entities;

namespace RecipeHub.Quiz.Infrastructure.Data.Configurations;

public class QuizOptionConfiguration : IEntityTypeConfiguration<QuizOption>
{
    public void Configure(EntityTypeBuilder<QuizOption> builder)
    {
        builder.ToTable("quiz_option", "quiz_db", t =>
        {
            t.HasCheckConstraint("quiz_option_sort_order_check", "sort_order > 0");
            t.HasCheckConstraint("quiz_option_content_check", "length(btrim(content)) > 0");
        });

        builder.HasKey(e => e.Id).HasName("quiz_option_pkey");
        builder.Property(e => e.Id)
            .HasColumnName("id")
            .UseIdentityByDefaultColumn();

        builder.Property(e => e.QuestionId)
            .HasColumnName("question_id")
            .IsRequired();
        builder.HasIndex(e => new { e.QuestionId, e.SortOrder }, "quiz_option_question_order_idx");

        builder.Property(e => e.SortOrder)
            .HasColumnName("sort_order")
            .HasDefaultValue(1)
            .IsRequired();

        builder.Property(e => e.Content)
            .HasColumnName("content")
            .IsRequired();

        builder.Property(e => e.IsCorrect)
            .HasColumnName("is_correct")
            .HasDefaultValue(false)
            .IsRequired();

        builder.HasOne(e => e.Question)
            .WithMany(q => q.Options)
            .HasForeignKey(e => e.QuestionId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("fk_quiz_option_question");
    }
}
