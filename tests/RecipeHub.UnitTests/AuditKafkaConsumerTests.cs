using System.Text;
using Confluent.Kafka;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using RecipeHub.Audit.Infrastructure;
using RecipeHub.Audit.Infrastructure.Messaging;
using RecipeHub.BuildingBlocks.Configuration;
using Xunit;

namespace RecipeHub.UnitTests;

public class AuditKafkaConsumerTests
{
    private static ConsumeResult<string, string> Record() => new()
    {
        Topic = "recipehub.audit.activities.v1", Partition = 2, Offset = 42,
        Message = new Message<string, string> { Key = "target", Value = "not-json",
            Headers = new Headers { { "source", Encoding.UTF8.GetBytes("recipe") } } }
    };

    [Fact]
    public async Task Consumer_CommitsAfterProcessing()
    {
        var operations = new List<string>();
        await AuditKafkaConsumer.ProcessAndCommitAsync(Record(), async _ =>
        {
            await Task.Yield();
            operations.Add("saved");
        }, _ => operations.Add("commit"), NullLogger.Instance, default);
        Assert.Equal(new[] { "saved", "commit" }, operations);
    }

    [Fact]
    public async Task Consumer_DlqFailure_DoesNotCommit()
    {
        var commits = 0;
        await Assert.ThrowsAsync<IOException>(() => AuditKafkaConsumer.ProcessAndCommitAsync(Record(),
            ct => AuditKafkaRetryPolicy.ProcessAsync(_ => Task.FromResult(AuditWriteResult.Poison),
                (_, _, _) => throw new IOException("DLQ unavailable"), 3, ct),
            _ => commits++, NullLogger.Instance, default));
        Assert.Equal(0, commits);
    }

    [Fact]
    public void DeadLetter_PreservesOriginalAndAddsMetadata()
    {
        var record = Record();
        var message = AuditKafkaConsumer.CreateDeadLetterMessage(record, "poison", 1);
        Assert.Equal(record.Message.Key, message.Key);
        Assert.Equal(record.Message.Value, message.Value);
        Assert.Equal(1, record.Message.Headers.Count);
        Assert.Equal(6, message.Headers.Count);
        foreach (var (key, value) in new[] { ("source", "recipe"), ("dlq-reason", "poison"),
                     ("dlq-attempts", "1"), ("dlq-original-topic", record.Topic),
                     ("dlq-original-partition", "2"), ("dlq-original-offset", "42") })
            Assert.Equal(value, Encoding.UTF8.GetString(message.Headers.GetLastBytes(key)));
    }

    [Fact]
    public void ConsumerConfig_UsesManualOffsetsAndEarliest()
    {
        var config = AuditKafkaConsumer.CreateConsumerConfig(new KafkaOptions());
        Assert.Equal("recipehub-audit", config.GroupId);
        Assert.Equal(false, config.EnableAutoCommit);
        Assert.Equal(false, config.EnableAutoOffsetStore);
        Assert.Equal(AutoOffsetReset.Earliest, config.AutoOffsetReset);
        Assert.Equal(300000, config.MaxPollIntervalMs);
    }

    [Theory]
    [InlineData("Redis", true, false)]
    [InlineData("Kafka", false, true)]
    [InlineData("Dual", true, true)]
    [InlineData(null, true, false)]
    public void AddAuditConsumer_SelectsByTransport(string? transport, bool redis, bool kafka)
    {
        var values = new Dictionary<string, string?>();
        if (transport != null) values["Messaging:AuditTransport"] = transport;
        var services = new ServiceCollection().AddLogging();
        services.AddAuditConsumer(new ConfigurationBuilder().AddInMemoryCollection(values).Build());
        using var provider = services.BuildServiceProvider();
        var consumers = provider.GetServices<IHostedService>().ToArray();
        Assert.Equal(redis, consumers.Any(x => x is AuditStreamConsumer));
        Assert.Equal(kafka, consumers.Any(x => x is AuditKafkaConsumer));
    }
}
