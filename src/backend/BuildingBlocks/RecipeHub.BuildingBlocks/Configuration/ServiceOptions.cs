namespace RecipeHub.BuildingBlocks.Configuration;

public sealed class DatabaseOptions
{
    public const string SectionName = "Database";
    public string ConnectionString { get; set; } = string.Empty;
}

public sealed class RedisOptions
{
    public const string SectionName = "Redis";
    public string ConnectionString { get; set; } = "localhost:6379";
    public string StreamName { get; set; } = "platform.heartbeat.v1";
    public string ConsumerGroup { get; set; } = "recipehub-workers";
}

public sealed class GrpcOptions
{
    public const string SectionName = "Grpc";
    public string RecipeServiceUrl { get; set; } = "http://localhost:5002";
}
