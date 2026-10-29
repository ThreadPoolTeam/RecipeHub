using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RecipeHub.Content.Domain;
using RecipeHub.Content.Infrastructure.Data;

namespace RecipeHub.Content.Infrastructure.Data.Configurations;

public sealed class AiImageDraftConfiguration : IEntityTypeConfiguration<AiImageDraft>
{
    public void Configure(EntityTypeBuilder<AiImageDraft> builder)
    {
        builder.ToTable("ai_image_draft", ContentDbContext.Schema);

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id)
            .HasColumnName("id")
            .UseIdentityByDefaultColumn();

        builder.Property(e => e.PublicId)
            .HasColumnName("public_id")
            .IsRequired();
        builder.HasIndex(e => e.PublicId)
            .IsUnique();

        builder.Property(e => e.RecipeVersionRef)
            .HasColumnName("recipe_version_ref")
            .IsRequired();

        builder.Property(e => e.RecipeStepRef)
            .HasColumnName("recipe_step_ref");

        builder.Property(e => e.TargetKind)
            .HasColumnName("target_kind")
            .IsRequired();

        builder.Property(e => e.UserBrief)
            .HasColumnName("user_brief");

        builder.Property(e => e.InputSnapshot)
            .HasColumnName("input_snapshot")
            .HasColumnType("jsonb")
            .IsRequired();

        builder.Property(e => e.PromptSnapshot)
            .HasColumnName("prompt_snapshot");

        builder.Property(e => e.Provider)
            .HasColumnName("provider")
            .HasDefaultValue(AiImageDraft.DefaultProvider)
            .IsRequired();

        builder.Property(e => e.Model)
            .HasColumnName("model")
            .HasDefaultValue(AiImageDraft.DefaultModel)
            .IsRequired();

        builder.Property(e => e.GeometryMode)
            .HasColumnName("geometry_mode")
            .HasDefaultValue(AiImageDraft.DefaultGeometryMode)
            .IsRequired();

        builder.Property(e => e.Width)
            .HasColumnName("width");

        builder.Property(e => e.Height)
            .HasColumnName("height");

        builder.Property(e => e.State)
            .HasColumnName("state")
            .HasDefaultValue(AiImageDraft.StateQueued)
            .IsRequired();

        builder.Property(e => e.TemporaryImagePath)
            .HasColumnName("temporary_image_path");

        builder.Property(e => e.MimeType)
            .HasColumnName("mime_type");

        builder.Property(e => e.ByteSize)
            .HasColumnName("byte_size");

        builder.Property(e => e.ErrorCode)
            .HasColumnName("error_code");

        builder.Property(e => e.ErrorMessage)
            .HasColumnName("error_message");

        builder.Property(e => e.AttemptCount)
            .HasColumnName("attempt_count")
            .HasDefaultValue(0)
            .IsRequired();

        builder.Property(e => e.LeaseToken)
            .HasColumnName("lease_token");

        builder.Property(e => e.LeaseExpiresAt)
            .HasColumnName("lease_expires_at");

        builder.Property(e => e.CreatedByUserRef)
            .HasColumnName("created_by_user_ref")
            .IsRequired();

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at")
            .HasDefaultValueSql("now()")
            .IsRequired();

        builder.Property(e => e.GeneratedAt)
            .HasColumnName("generated_at");

        builder.Property(e => e.ExpiresAt)
            .HasColumnName("expires_at");

        builder.Property(e => e.DecidedAt)
            .HasColumnName("decided_at");

        builder.Property(e => e.DecidedByUserRef)
            .HasColumnName("decided_by_user_ref");

        // Indexes
        builder.HasIndex(e => new { e.RecipeVersionRef, e.TargetKind })
            .HasDatabaseName("ai_image_draft_recipe_target_idx");

        builder.HasIndex(e => e.RecipeStepRef)
            .HasDatabaseName("ai_image_draft_step_idx");

        builder.HasIndex(e => new { e.State, e.ExpiresAt })
            .HasDatabaseName("ai_image_draft_cleanup_idx");

        builder.HasIndex(e => new { e.CreatedByUserRef, e.CreatedAt })
            .HasDatabaseName("ai_image_draft_creator_idx");

        builder.HasIndex(e => new { e.State, e.LeaseExpiresAt })
            .HasDatabaseName("ai_image_draft_worker_lease_idx");

        // Checks
        builder.ToTable(t =>
        {
            t.HasCheckConstraint(
                "ai_image_draft_target_kind_check",
                "target_kind IN ('final_product', 'step_instruction')");

            t.HasCheckConstraint(
                "ai_image_draft_target_reference_check",
                "(target_kind = 'final_product' AND recipe_step_ref IS NULL) OR (target_kind = 'step_instruction' AND recipe_step_ref IS NOT NULL)");

            t.HasCheckConstraint(
                "ai_image_draft_state_check",
                "state IN ('queued', 'processing', 'generated', 'failed', 'accepting', 'accepted', 'discarded', 'expired')");

            t.HasCheckConstraint(
                "ai_image_draft_geometry_mode_check",
                "geometry_mode = 'native'");

            t.HasCheckConstraint(
                "ai_image_draft_expiry_check",
                "(generated_at IS NULL AND expires_at IS NULL) OR (generated_at IS NOT NULL AND expires_at IS NOT NULL AND expires_at > generated_at)");

            t.HasCheckConstraint(
                "ai_image_draft_generated_time_check",
                "state NOT IN ('generated', 'accepting', 'accepted', 'expired') OR (generated_at IS NOT NULL AND expires_at IS NOT NULL AND prompt_snapshot IS NOT NULL)");

            t.HasCheckConstraint(
                "ai_image_draft_generated_file_check",
                "state NOT IN ('generated', 'accepting') OR (temporary_image_path IS NOT NULL AND width > 0 AND height > 0 AND byte_size > 0)");

            t.HasCheckConstraint(
                "ai_image_draft_decision_check",
                "state NOT IN ('accepted', 'discarded') OR (decided_at IS NOT NULL AND decided_by_user_ref IS NOT NULL)");
        });
    }
}
