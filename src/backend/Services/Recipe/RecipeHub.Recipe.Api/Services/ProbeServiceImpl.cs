using Grpc.Core;
using RecipeHub.GrpcContracts;

namespace RecipeHub.Recipe.Api.Services;

public sealed class ProbeServiceImpl : ServiceProbe.ServiceProbeBase
{
    private readonly ILogger<ProbeServiceImpl> _logger;

    public ProbeServiceImpl(ILogger<ProbeServiceImpl> logger)
    {
        _logger = logger;
    }

    public override Task<ProbeResponse> Ping(ProbeRequest request, ServerCallContext context)
    {
        _logger.LogInformation("gRPC Ping received from {CallerService} with CorrelationId {CorrelationId}",
            request.CallerService, request.CorrelationId);

        return Task.FromResult(new ProbeResponse
        {
            TargetService = "RecipeHub.Recipe.Api",
            CorrelationId = request.CorrelationId,
            Status = "Healthy",
            TimestampUtc = DateTime.UtcNow.ToString("O")
        });
    }
}
