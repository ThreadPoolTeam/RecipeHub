using Microsoft.Extensions.Logging.Abstractions;
using RecipeHub.BuildingBlocks.Audit;
using RecipeHub.BuildingBlocks.Events;

using Xunit;

namespace RecipeHub.UnitTests;

public class AuditTests
{
    [Fact]
    public void EnvelopeSerialization_PreservesAllFields()
    {
        var evt = new AuditActivityEvent(
            ActorId: Guid.NewGuid(),
            ActorName: "Nguyễn Văn A",
            ActorRole: "rnd",
            Action: "recipe.version_created",
            TargetType: "recipe_version",
            TargetId: Guid.NewGuid(),
            Summary: "Tạo phiên bản SOP v2 cho công thức Cà phê muối"
        );

        var envelope = new EventEnvelope<AuditActivityEvent>
        {
            EventId = Guid.NewGuid().ToString("N"),
            EventType = AuditActivityEvent.EventTypeName,
            OccurredAtUtc = DateTime.UtcNow,
            Source = "recipe",
            SchemaVersion = AuditActivityEvent.CurrentSchemaVersion,
            Payload = evt
        };

        var json = envelope.ToJson();
        var deserialized = EventEnvelope<AuditActivityEvent>.FromJson(json);

        Assert.NotNull(deserialized);
        Assert.Equal(envelope.EventId, deserialized.EventId);
        Assert.Equal(envelope.EventType, deserialized.EventType);
        Assert.Equal(envelope.Source, deserialized.Source);
        Assert.Equal(envelope.SchemaVersion, deserialized.SchemaVersion);

        Assert.NotNull(deserialized.Payload);
        Assert.Equal(evt.ActorId, deserialized.Payload.ActorId);
        Assert.Equal(evt.ActorName, deserialized.Payload.ActorName);
        Assert.Equal(evt.ActorRole, deserialized.Payload.ActorRole);
        Assert.Equal(evt.Action, deserialized.Payload.Action);
        Assert.Equal(evt.TargetType, deserialized.Payload.TargetType);
        Assert.Equal(evt.TargetId, deserialized.Payload.TargetId);
        Assert.Equal(evt.Summary, deserialized.Payload.Summary);
    }

    [Fact]
    public async Task RedisPublisher_WhenRedisNull_DoesNotThrow()
    {
        var publisher = new RedisAuditActivityPublisher(NullLogger<RedisAuditActivityPublisher>.Instance, null);
        var evt = new AuditActivityEvent(Guid.NewGuid(), "Admin", "admin", "user.locked", "user", Guid.NewGuid(), "Khóa user");

        await publisher.PublishAsync("identity", evt);
    }

}
