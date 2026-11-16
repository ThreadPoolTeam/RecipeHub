using System.Diagnostics;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using RecipeHub.BuildingBlocks.Audit;
using RecipeHub.BuildingBlocks.Configuration;
using RecipeHub.BuildingBlocks.Events;
using Xunit;

namespace RecipeHub.UnitTests;

public class KafkaAuditTests
{
    internal static AuditActivityEvent Activity() => new(Guid.NewGuid(), "Admin", "admin",
        "recipe.created", "recipe", Guid.NewGuid(), "Tạo công thức");

    [Fact]
    public async Task KafkaPublisher_WhenBootstrapEmpty_DoesNotThrow()
    {
        using var publisher = new KafkaAuditActivityPublisher(Options.Create(new KafkaOptions()),
            NullLogger<KafkaAuditActivityPublisher>.Instance);
        await publisher.PublishAsync("recipe", Activity());
    }

    [Fact]
    public async Task KafkaPublisher_WhenBrokerUnreachable_DoesNotThrow()
    {
        using var publisher = new KafkaAuditActivityPublisher(Options.Create(new KafkaOptions
        { BootstrapServers = "localhost:1", ProduceTimeoutMs = 500 }), NullLogger<KafkaAuditActivityPublisher>.Instance);
        var watch = Stopwatch.StartNew();
        await publisher.PublishAsync("recipe", Activity()).WaitAsync(TimeSpan.FromSeconds(5));
        Assert.True(watch.Elapsed < TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void EnvelopeFactory_ProducesSameShapeForBothTransports()
    {
        var activity = Activity();
        var envelope = AuditEnvelopeFactory.Create("recipe", activity);
        var copy = EventEnvelope<AuditActivityEvent>.FromJson(envelope.ToJson());
        Assert.Equal(envelope, copy);
        Assert.Equal(AuditActivityEvent.EventTypeName, copy!.EventType);
        Assert.Equal(AuditActivityEvent.CurrentSchemaVersion, copy.SchemaVersion);
        Assert.Equal("recipe", copy.Source);
        Assert.Equal(activity, copy.Payload);
    }

    [Fact]
    public void MessageKey_IsTargetIdInNFormat()
    {
        var envelope = AuditEnvelopeFactory.Create("recipe", Activity());
        var message = KafkaAuditActivityPublisher.CreateMessage(envelope);
        Assert.Equal(envelope.Payload.TargetId.ToString("N"), message.Key);
        Assert.Equal(envelope.ToJson(), message.Value);
        foreach (var (key, value) in new[] { ("event-id", envelope.EventId), ("event-type", envelope.EventType),
                     ("source", envelope.Source), ("schema-version", envelope.SchemaVersion) })
            Assert.Equal(value, Encoding.UTF8.GetString(message.Headers.GetLastBytes(key)));
    }

    [Theory]
    [InlineData("Redis", typeof(RedisAuditActivityPublisher))]
    [InlineData("Kafka", typeof(KafkaAuditActivityPublisher))]
    [InlineData("Dual", typeof(CompositeAuditActivityPublisher))]
    public void AddAuditActivityPublisher_SelectsByTransport(string transport, Type expected)
    {
        using var provider = Services(transport).BuildServiceProvider();
        Assert.IsType(expected, provider.GetRequiredService<IAuditActivityPublisher>());
    }

    [Fact]
    public void AddAuditActivityPublisher_DefaultsToRedis_WhenKeyMissing()
    {
        using var provider = Services(null).BuildServiceProvider();
        Assert.IsType<RedisAuditActivityPublisher>(provider.GetRequiredService<IAuditActivityPublisher>());
    }

    [Fact]
    public async Task CompositePublisher_ContinuesWhenOneFails()
    {
        var second = new RecordingPublisher();
        var publisher = new CompositeAuditActivityPublisher(new IAuditActivityPublisher[] { new ThrowingPublisher(), second },
            NullLogger<CompositeAuditActivityPublisher>.Instance);
        await publisher.PublishAsync("recipe", Activity());
        Assert.Equal(1, second.Calls);
    }

    private static IServiceCollection Services(string? transport)
    {
        var values = new Dictionary<string, string?>();
        if (transport != null) values["Messaging:AuditTransport"] = transport;
        return new ServiceCollection().AddLogging().AddAuditActivityPublisher(
            new ConfigurationBuilder().AddInMemoryCollection(values).Build());
    }

    [Fact]
    public async Task CompositePublisher_ReusesEnvelopeAcrossTransports()
    {
        var first = new EnvelopePublisher();
        var second = new EnvelopePublisher();
        var publisher = new CompositeAuditActivityPublisher(new[] { first, second },
            NullLogger<CompositeAuditActivityPublisher>.Instance);
        await publisher.PublishAsync("recipe", Activity());
        Assert.NotNull(first.Envelope);
        Assert.Same(first.Envelope, second.Envelope);
        Assert.Equal(first.Envelope.ToJson(), second.Envelope!.ToJson());
    }

    [Fact]
    public void AddAuditActivityPublisher_PreservesExistingRegistration()
    {
        var fake = new RecordingPublisher();
        var services = new ServiceCollection().AddSingleton<IAuditActivityPublisher>(fake);
        services.AddAuditActivityPublisher(new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["Messaging:AuditTransport"] = "Kafka" }).Build());
        using var provider = services.BuildServiceProvider();
        Assert.Same(fake, provider.GetRequiredService<IAuditActivityPublisher>());
    }

    private sealed class EnvelopePublisher : IAuditActivityPublisher, IAuditEnvelopePublisher
    {
        public EventEnvelope<AuditActivityEvent>? Envelope { get; private set; }
        public Task PublishAsync(string source, AuditActivityEvent activity, CancellationToken cancellationToken = default)
            => throw new InvalidOperationException("Dual must use shared envelope");
        public Task PublishEnvelopeAsync(EventEnvelope<AuditActivityEvent> envelope, CancellationToken cancellationToken)
        { Envelope = envelope; return Task.CompletedTask; }
    }

    private sealed class ThrowingPublisher : IAuditActivityPublisher
    {
        public Task PublishAsync(string source, AuditActivityEvent activity, CancellationToken cancellationToken = default)
            => throw new InvalidOperationException("transport unavailable");
    }

    private sealed class RecordingPublisher : IAuditActivityPublisher
    {
        public int Calls { get; private set; }
        public Task PublishAsync(string source, AuditActivityEvent activity, CancellationToken cancellationToken = default)
        { Calls++; return Task.CompletedTask; }
    }
}
