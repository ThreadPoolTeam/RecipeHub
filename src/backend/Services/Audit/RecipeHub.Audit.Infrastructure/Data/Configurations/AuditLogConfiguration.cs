using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RecipeHub.Audit.Domain.Entities;

namespace RecipeHub.Audit.Infrastructure.Data.Configurations;

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("audit_log", "audit_db");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .HasColumnName("id")
            .IsRequired();

        builder.Property(x => x.ActorId)
            .HasColumnName("actor_id")
            .IsRequired();

        builder.Property(x => x.ActorName)
            .HasColumnName("actor_name")
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(x => x.ActorRole)
            .HasColumnName("actor_role")
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(x => x.Source)
            .HasColumnName("source")
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(x => x.Action)
            .HasColumnName("action")
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.TargetType)
            .HasColumnName("target_type")
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(x => x.TargetId)
            .HasColumnName("target_id")
            .IsRequired();

        builder.Property(x => x.Summary)
            .HasColumnName("summary")
            .IsRequired();

        builder.Property(x => x.OccurredAt)
            .HasColumnName("occurred_at")
            .HasColumnType("timestamp with time zone")
            .IsRequired();

        builder.HasIndex(x => new { x.OccurredAt, x.Id })
            .HasDatabaseName("audit_log_occurred_at_id_idx");

        builder.HasIndex(x => new { x.ActorId, x.OccurredAt, x.Id })
            .HasDatabaseName("audit_log_actor_occurred_idx");

        builder.HasIndex(x => new { x.TargetType, x.TargetId, x.OccurredAt, x.Id })
            .HasDatabaseName("audit_log_target_occurred_idx");
    }
}
