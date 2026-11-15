using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeHub.Audit.Domain.Entities;
using RecipeHub.Audit.Infrastructure.Data;
using RecipeHub.Audit.Infrastructure.Messaging;
using RecipeHub.BuildingBlocks.Audit;
using RecipeHub.BuildingBlocks.Events;
using Xunit;

namespace RecipeHub.UnitTests;

public class AuditLogWriterTests
{
    [Fact]
    public async Task Write_ValidEnvelope_ReturnsSaved()
    {
        using var context = new StubContext();
        var envelope = AuditEnvelopeFactory.Create("recipe", KafkaAuditTests.Activity());
        Assert.Equal(AuditWriteResult.Saved, await new AuditLogWriter(context).WriteAsync(envelope.ToJson()));
        var log = Assert.Single(context.ChangeTracker.Entries<AuditLog>()).Entity;
        Assert.Equal(Guid.Parse(envelope.EventId), log.Id);
        Assert.Equal(envelope.Payload.ActorId, log.ActorId);
        Assert.Equal(envelope.Payload.ActorName, log.ActorName);
        Assert.Equal(envelope.Payload.ActorRole, log.ActorRole);
        Assert.Equal(envelope.Payload.Action, log.Action);
        Assert.Equal(envelope.Payload.TargetId, log.TargetId);
        Assert.Equal(envelope.Payload.TargetType, log.TargetType);
        Assert.Equal(envelope.Payload.Summary, log.Summary);
        Assert.Equal(envelope.Source, log.Source);
        Assert.Equal(envelope.OccurredAtUtc, log.OccurredAt);
        Assert.Equal(1, context.Saves);
    }

    [Fact]
    public async Task Write_EmptyPayload_ReturnsPoison() => await AssertPoison("{\"Payload\":null}");

    [Fact]
    public async Task Write_InvalidJson_ReturnsPoison() => await AssertPoison("not-json");

    [Fact]
    public async Task Write_NonGuidEventId_ReturnsPoison() => await AssertPoison(
        (AuditEnvelopeFactory.Create("recipe", KafkaAuditTests.Activity()) with { EventId = "invalid" }).ToJson());

    [Fact]
    public async Task Write_DuplicateKey_ReturnsDuplicate()
    {
        using var context = new StubContext { Failure = new DbUpdateException("duplicate",
            new PostgresException("duplicate", "ERROR", "ERROR", "23505")) };
        Assert.Equal(AuditWriteResult.Duplicate, await new AuditLogWriter(context).WriteAsync(
            AuditEnvelopeFactory.Create("recipe", KafkaAuditTests.Activity()).ToJson()));
    }

    [Fact]
    public async Task Write_InfrastructureFailure_Propagates()
    {
        using var context = new StubContext { Failure = new InvalidOperationException("database unavailable") };
        await Assert.ThrowsAsync<InvalidOperationException>(() => new AuditLogWriter(context).WriteAsync(
            AuditEnvelopeFactory.Create("recipe", KafkaAuditTests.Activity()).ToJson()));
    }

    [Theory]
    [InlineData("")]
    [InlineData("null")]
    [InlineData("{}")]
    public async Task Write_MissingEnvelope_ReturnsPoison(string json) => await AssertPoison(json);

    private static async Task AssertPoison(string json)
    {
        using var context = new StubContext();
        Assert.Equal(AuditWriteResult.Poison, await new AuditLogWriter(context).WriteAsync(json));
        Assert.Equal(0, context.Saves);
    }

    private sealed class StubContext() : AuditDbContext(new DbContextOptionsBuilder<AuditDbContext>()
        .UseNpgsql("Host=localhost;Database=unused").Options)
    {
        public Exception? Failure { get; init; }
        public int Saves { get; private set; }
        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            Saves++;
            return Failure == null ? Task.FromResult(1) : Task.FromException<int>(Failure);
        }
    }
}
