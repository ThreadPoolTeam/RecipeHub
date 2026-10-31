using System.Security.Claims;
using System.Text.Encodings.Web;
using Grpc.Core;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using RecipeHub.Content.Api;
using RecipeHub.Content.Application.DTOs;
using RecipeHub.Content.Application.Exceptions;
using RecipeHub.Content.Application.Interfaces;
using RecipeHub.Content.Application.Services;
using RecipeHub.Content.Domain;
using RecipeHub.Content.Infrastructure.Clients;
using RecipeHub.GrpcContracts.Identity;
using Xunit;

namespace RecipeHub.UnitTests;

public class ContentAuthenticationTests
{
    // =========================================================================
    // 1. ContentCallerContext & Subject Claim vs X-User-Id Spoofing Tests
    // =========================================================================

    [Fact]
    public void ContentCallerContext_UserId_UsesSubjectClaim_AndIgnoresSpoofedXUserIdHeader()
    {
        var realUserId = Guid.NewGuid();
        var spoofedUserId = Guid.NewGuid();

        var context = new DefaultHttpContext();
        context.Request.Headers["X-User-Id"] = spoofedUserId.ToString();

        var identity = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, realUserId.ToString())
        }, "Bearer");
        context.User = new ClaimsPrincipal(identity);

        var accessor = new HttpContextAccessor { HttpContext = context };
        var callerContext = new ContentCallerContext(accessor);

        Assert.Equal(realUserId, callerContext.UserId);
        Assert.NotEqual(spoofedUserId, callerContext.UserId);
    }

    [Fact]
    public void ContentCallerContext_UserId_WithoutClaim_ReturnsEmptyGuid()
    {
        var context = new DefaultHttpContext();
        context.Request.Headers["X-User-Id"] = Guid.NewGuid().ToString();

        var accessor = new HttpContextAccessor { HttpContext = context };
        var callerContext = new ContentCallerContext(accessor);

        Assert.Equal(Guid.Empty, callerContext.UserId);
    }

    [Fact]
    public void ContentCallerContext_UserId_WithInvalidGuidClaim_ReturnsEmptyGuid()
    {
        var context = new DefaultHttpContext();
        var identity = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "not-a-valid-guid")
        }, "Bearer");
        context.User = new ClaimsPrincipal(identity);

        var accessor = new HttpContextAccessor { HttpContext = context };
        var callerContext = new ContentCallerContext(accessor);

        Assert.Equal(Guid.Empty, callerContext.UserId);
    }

    // =========================================================================
    // 2. ApplicationExceptionHandler Fail-Closed Dependency Mapping (503)
    // =========================================================================

    [Fact]
    public async Task ApplicationExceptionHandler_MapsContentDependencyException_To503ServiceUnavailable()
    {
        var problemDetails = new TestProblemDetailsService();
        var handler = new ApplicationExceptionHandler(problemDetails);

        var context = new DefaultHttpContext();
        var exception = new ContentDependencyException("Identity service unavailable", new RpcException(new Status(StatusCode.Unavailable, "Down")));

        var handled = await handler.TryHandleAsync(context, exception, CancellationToken.None);

        Assert.True(handled);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, context.Response.StatusCode);
        Assert.NotNull(problemDetails.LastContext);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, problemDetails.LastContext.ProblemDetails.Status);
        Assert.Equal("Service unavailable", problemDetails.LastContext.ProblemDetails.Title);
    }

    [Fact]
    public async Task ApplicationExceptionHandler_MapsRpcException_DirectlyTo503ServiceUnavailable()
    {
        var problemDetails = new TestProblemDetailsService();
        var handler = new ApplicationExceptionHandler(problemDetails);

        var context = new DefaultHttpContext();
        var exception = new RpcException(new Status(StatusCode.DeadlineExceeded, "Timeout"));

        var handled = await handler.TryHandleAsync(context, exception, CancellationToken.None);

        Assert.True(handled);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, context.Response.StatusCode);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, problemDetails.LastContext?.ProblemDetails.Status);
        Assert.Equal("Dịch vụ phụ thuộc không khả dụng. Vui lòng thử lại sau.", problemDetails.LastContext?.ProblemDetails.Detail);
        Assert.DoesNotContain("Timeout", problemDetails.LastContext?.ProblemDetails.Detail ?? string.Empty);
    }
    [Fact]
    public async Task ApplicationExceptionHandler_MapsForbiddenException_To403Forbidden()
    {
        var problemDetails = new TestProblemDetailsService();
        var handler = new ApplicationExceptionHandler(problemDetails);

        var context = new DefaultHttpContext();
        var exception = new ForbiddenException("Viewer cannot access this resource.");

        var handled = await handler.TryHandleAsync(context, exception, CancellationToken.None);

        Assert.True(handled);
        Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
        Assert.Equal(StatusCodes.Status403Forbidden, problemDetails.LastContext?.ProblemDetails.Status);
        Assert.Equal("Forbidden", problemDetails.LastContext?.ProblemDetails.Title);
    }

    [Fact]
    public async Task RecipeGrpcContextClient_GetMediaUsagesAsync_WithoutToken_ThrowsUnauthorizedAccessException()
    {
        var callerContext = new FakeCallerContext { AccessToken = "" };
        var client = new RecipeGrpcContextClient(
            null!,
            null!,
            callerContext,
            NullLogger<RecipeGrpcContextClient>.Instance);

        var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(() => client.GetMediaUsagesAsync(Guid.NewGuid()));
        Assert.Contains("Cần Bearer token hợp lệ", ex.Message);
    }

    [Fact]
    public async Task RecipeGrpcContextClient_GetRecipeAiContextAsync_WithoutToken_ThrowsUnauthorizedAccessException()
    {
        var callerContext = new FakeCallerContext { AccessToken = "" };
        var client = new RecipeGrpcContextClient(
            null!,
            null!,
            callerContext,
            NullLogger<RecipeGrpcContextClient>.Instance);

        var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(() => client.GetRecipeAiContextAsync(Guid.NewGuid(), null, "final_product"));
        Assert.Contains("Cần Bearer token hợp lệ", ex.Message);
    }

    // =========================================================================
    // 3. ContentAuthenticationHandler Authentication & Token Boundary Tests
    // =========================================================================

    [Fact]
    public async Task ContentAuthenticationHandler_NonContentPath_ReturnsNoResult()
    {
        var mockClient = new MockIdentitySessionClient();
        var handler = CreateAuthenticationHandler(mockClient);

        var context = new DefaultHttpContext();
        context.Request.Path = "/health/live";
        context.Request.Headers.Authorization = "Bearer some_token";

        await handler.InitializeAsync(new AuthenticationScheme("Bearer", null, typeof(ContentAuthenticationHandler)), context);
        var result = await handler.AuthenticateAsync();

        Assert.True(result.None);
    }

    [Fact]
    public async Task ContentAuthenticationHandler_MissingBearerHeader_ReturnsNoResult()
    {
        var mockClient = new MockIdentitySessionClient();
        var handler = CreateAuthenticationHandler(mockClient);

        var context = new DefaultHttpContext();
        context.Request.Path = "/api/v1/content/media-assets";

        await handler.InitializeAsync(new AuthenticationScheme("Bearer", null, typeof(ContentAuthenticationHandler)), context);
        var result = await handler.AuthenticateAsync();

        Assert.True(result.None);
    }

    [Fact]
    public async Task ContentAuthenticationHandler_EmptyBearerToken_ReturnsFail()
    {
        var mockClient = new MockIdentitySessionClient();
        var handler = CreateAuthenticationHandler(mockClient);

        var context = new DefaultHttpContext();
        context.Request.Path = "/api/v1/content/media-assets";
        context.Request.Headers.Authorization = "Bearer   ";

        await handler.InitializeAsync(new AuthenticationScheme("Bearer", null, typeof(ContentAuthenticationHandler)), context);
        var result = await handler.AuthenticateAsync();

        Assert.False(result.Succeeded);
        Assert.Equal("Bearer token is empty.", result.Failure?.Message);
    }

    [Fact]
    public async Task ContentAuthenticationHandler_RevokedOrExpiredSession_ReturnsFail()
    {
        var mockClient = new MockIdentitySessionClient
        {
            ResponseToReturn = new ValidateSessionResponse { Valid = false }
        };
        var handler = CreateAuthenticationHandler(mockClient);

        var context = new DefaultHttpContext();
        context.Request.Path = "/api/v1/content/media-assets";
        context.Request.Headers.Authorization = "Bearer expired_or_revoked_token";

        await handler.InitializeAsync(new AuthenticationScheme("Bearer", null, typeof(ContentAuthenticationHandler)), context);
        var result = await handler.AuthenticateAsync();

        Assert.False(result.Succeeded);
        Assert.Equal("Session has expired or was revoked.", result.Failure?.Message);
    }

    [Fact]
    public async Task ContentAuthenticationHandler_ValidSession_ReturnsSuccessWithClaims()
    {
        var expectedUserId = Guid.NewGuid();
        var mockClient = new MockIdentitySessionClient
        {
            ResponseToReturn = new ValidateSessionResponse
            {
                Valid = true,
                UserId = expectedUserId.ToString(),
                Role = "RD"
            }
        };
        var handler = CreateAuthenticationHandler(mockClient);

        var context = new DefaultHttpContext();
        context.Request.Path = "/api/v1/content/media-assets";
        context.Request.Headers.Authorization = "Bearer valid_session_token";

        await handler.InitializeAsync(new AuthenticationScheme("Bearer", null, typeof(ContentAuthenticationHandler)), context);
        var result = await handler.AuthenticateAsync();

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Principal);
        Assert.Equal(expectedUserId.ToString(), result.Principal.FindFirst(ClaimTypes.NameIdentifier)?.Value);
        Assert.Equal("rd", result.Principal.FindFirst(ClaimTypes.Role)?.Value);
    }

    [Fact]
    public async Task ContentAuthenticationHandler_WhenIdentityThrowsRpcException_ThrowsContentDependencyException()
    {
        var mockClient = new MockIdentitySessionClient
        {
            ExceptionToThrow = new RpcException(new Status(StatusCode.Unavailable, "Identity service is down"))
        };
        var handler = CreateAuthenticationHandler(mockClient);

        var context = new DefaultHttpContext();
        context.Request.Path = "/api/v1/content/media-assets";
        context.Request.Headers.Authorization = "Bearer valid_format_token";

        await handler.InitializeAsync(new AuthenticationScheme("Bearer", null, typeof(ContentAuthenticationHandler)), context);

        var ex = await Assert.ThrowsAsync<ContentDependencyException>(() => handler.AuthenticateAsync());
        Assert.Contains("Identity session validation service is unavailable", ex.Message);
        Assert.IsType<RpcException>(ex.InnerException);
    }

    // =========================================================================
    // 4. Viewer Resource Authorization Checks (Published vs Unreferenced)
    // =========================================================================

    [Fact]
    public async Task MediaAssetService_GetMediaAssetById_WhenViewerAndUnreferenced_ThrowsForbiddenException()
    {
        var assetId = Guid.NewGuid();
        var asset = CreateSampleAsset(assetId);

        var assetRepo = new FakeMediaAssetRepository(asset);
        var recipeClient = new FakeRecipeContextClient
        {
            // Empty usages -> not linked to any recipe
            UsagesToReturn = new List<MediaAssetUsageItem>()
        };
        var callerContext = new FakeCallerContext { Role = "viewer", IsAuthenticated = true };

        var service = new MediaAssetService(
            assetRepo,
            new FakeDraftRepository(),
            new FakeOutboxRepository(),
            new FakeUnitOfWork(),
            new FakeMediaStorage(),
            recipeClient,
            callerContext);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => service.GetMediaAssetByIdAsync(assetId));
        Assert.Contains("Viewer không có quyền truy cập", ex.Message);
    }

    [Fact]
    public async Task MediaAssetService_GetMediaAssetById_WhenViewerAndRecipeNotEligible_ThrowsForbiddenException()
    {
        var assetId = Guid.NewGuid();
        var recipeVersionId = Guid.NewGuid();
        var asset = CreateSampleAsset(assetId);

        var assetRepo = new FakeMediaAssetRepository(asset);
        var recipeClient = new FakeRecipeContextClient
        {
            UsagesToReturn = new List<MediaAssetUsageItem>
            {
                new()
                {
                    RecipeId = Guid.NewGuid(),
                    RecipeVersionId = recipeVersionId,
                    RecipeTitle = "Test Recipe",
                    UsageKind = "Cover",
                    LinkedAt = DateTimeOffset.UtcNow
                }
            },
            EligibilityToReturn = new List<RecipeVersionEligibilityItem>
            {
                new(recipeVersionId, IsEligible: false, Status: "Draft")
            }
        };
        var callerContext = new FakeCallerContext { Role = "viewer", IsAuthenticated = true };

        var service = new MediaAssetService(
            assetRepo,
            new FakeDraftRepository(),
            new FakeOutboxRepository(),
            new FakeUnitOfWork(),
            new FakeMediaStorage(),
            recipeClient,
            callerContext);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => service.GetMediaAssetByIdAsync(assetId));
        Assert.Contains("Viewer không có quyền truy cập", ex.Message);
    }

    [Fact]
    public async Task MediaAssetService_GetMediaAssetById_WhenViewerAndRecipeIsEligible_ReturnsAssetDetail()
    {
        var assetId = Guid.NewGuid();
        var recipeVersionId = Guid.NewGuid();
        var asset = CreateSampleAsset(assetId);

        var assetRepo = new FakeMediaAssetRepository(asset);
        var recipeClient = new FakeRecipeContextClient
        {
            UsagesToReturn = new List<MediaAssetUsageItem>
            {
                new()
                {
                    RecipeId = Guid.NewGuid(),
                    RecipeVersionId = recipeVersionId,
                    RecipeTitle = "Test Recipe",
                    UsageKind = "Cover",
                    LinkedAt = DateTimeOffset.UtcNow
                }
            },
            EligibilityToReturn = new List<RecipeVersionEligibilityItem>
            {
                new(recipeVersionId, IsEligible: true, Status: "Approved")
            }
        };
        var callerContext = new FakeCallerContext { Role = "viewer", IsAuthenticated = true };

        var service = new MediaAssetService(
            assetRepo,
            new FakeDraftRepository(),
            new FakeOutboxRepository(),
            new FakeUnitOfWork(),
            new FakeMediaStorage(),
            recipeClient,
            callerContext);

        var result = await service.GetMediaAssetByIdAsync(assetId);

        Assert.NotNull(result);
        Assert.Equal(assetId, result.AssetId);
    }

    [Fact]
    public async Task MediaAssetService_GetMediaAssetById_WhenEditor_BypassesRecipeEligibilityCheck()
    {
        var assetId = Guid.NewGuid();
        var asset = CreateSampleAsset(assetId);

        var assetRepo = new FakeMediaAssetRepository(asset);
        var recipeClient = new FakeRecipeContextClient
        {
            UsagesToReturn = new List<MediaAssetUsageItem>() // no usages
        };
        var callerContext = new FakeCallerContext { Role = "rd", IsAuthenticated = true };

        var service = new MediaAssetService(
            assetRepo,
            new FakeDraftRepository(),
            new FakeOutboxRepository(),
            new FakeUnitOfWork(),
            new FakeMediaStorage(),
            recipeClient,
            callerContext);

        var result = await service.GetMediaAssetByIdAsync(assetId);

        Assert.NotNull(result);
        Assert.Equal(assetId, result.AssetId);
    }

    // =========================================================================
    // Test Doubles & Helper Classes
    // =========================================================================

    private static MediaAsset CreateSampleAsset(Guid assetId)
    {
        return new MediaAsset
        {
            PublicId = assetId,
            DeliveryUrl = "https://cdn.recipehub.demo/media/" + assetId,
            SourceType = MediaAsset.SourceTypeReal,
            State = MediaAsset.StateActive,
            MimeType = "image/png",
            ByteSize = 1024,
            Width = 800,
            Height = 600,
            OriginalFileName = "test.png",
            StorageProvider = MediaAsset.DefaultStorageProvider,
            ProviderPublicId = "test_provider_id",
            CreatedByUserRef = Guid.NewGuid(),
            CreatedAt = DateTimeOffset.UtcNow
        };
    }

    private static ContentAuthenticationHandler CreateAuthenticationHandler(IdentitySession.IdentitySessionClient client)
    {
        var optionsMonitor = new TestOptionsMonitor<AuthenticationSchemeOptions>(new AuthenticationSchemeOptions());
        var loggerFactory = NullLoggerFactory.Instance;
        var encoder = UrlEncoder.Default;

        return new ContentAuthenticationHandler(optionsMonitor, loggerFactory, encoder, client);
    }

    private sealed class TestOptionsMonitor<T>(T current) : IOptionsMonitor<T>
    {
        public T CurrentValue => current;
        public T Get(string? name) => current;
        public IDisposable? OnChange(Action<T, string?> listener) => null;
    }

    private sealed class TestProblemDetailsService : Microsoft.AspNetCore.Http.IProblemDetailsService
    {
        public ProblemDetailsContext? LastContext { get; private set; }

        public ValueTask<bool> TryWriteAsync(ProblemDetailsContext context)
        {
            LastContext = context;
            return ValueTask.FromResult(true);
        }

        public ValueTask WriteAsync(ProblemDetailsContext context)
        {
            LastContext = context;
            return ValueTask.CompletedTask;
        }
    }
    public class MockIdentitySessionClient : IdentitySession.IdentitySessionClient
    {
        public ValidateSessionResponse? ResponseToReturn { get; set; }
        public Exception? ExceptionToThrow { get; set; }

        public override AsyncUnaryCall<ValidateSessionResponse> ValidateAsync(
            ValidateSessionRequest request,
            Metadata? headers = null,
            DateTime? deadline = null,
            CancellationToken cancellationToken = default)
        {
            if (ExceptionToThrow != null)
            {
                return new AsyncUnaryCall<ValidateSessionResponse>(
                    Task.FromException<ValidateSessionResponse>(ExceptionToThrow),
                    Task.FromResult(new Metadata()),
                    () => Status.DefaultSuccess,
                    () => new Metadata(),
                    () => { });
            }

            var resp = ResponseToReturn ?? new ValidateSessionResponse { Valid = false };
            return new AsyncUnaryCall<ValidateSessionResponse>(
                Task.FromResult(resp),
                Task.FromResult(new Metadata()),
                () => Status.DefaultSuccess,
                () => new Metadata(),
                () => { });
        }
    }

    private sealed class FakeCallerContext : IContentCallerContext
    {
        public Guid UserId { get; set; } = Guid.NewGuid();
        public string Role { get; set; } = "rd";
        public string AccessToken { get; set; } = "test_token";
        public bool IsAuthenticated { get; set; } = true;
    }

    private sealed class FakeMediaAssetRepository : IMediaAssetRepository
    {
        private readonly MediaAsset? _asset;

        public FakeMediaAssetRepository(MediaAsset? asset = null)
        {
            _asset = asset;
        }

        public Task<MediaAsset?> GetByPublicIdAsync(Guid publicId, CancellationToken ct = default)
        {
            return Task.FromResult(_asset?.PublicId == publicId ? _asset : null);
        }

        public Task<MediaAsset?> GetByAiDraftIdAsync(long draftId, CancellationToken ct = default) => Task.FromResult<MediaAsset?>(null);

        public Task<(IReadOnlyList<MediaAsset> Items, int TotalCount)> ListAsync(string? sourceType, string? state, string? search, int page, int pageSize, CancellationToken ct = default)
        {
            IReadOnlyList<MediaAsset> list = _asset != null ? new[] { _asset } : Array.Empty<MediaAsset>();
            return Task.FromResult((list, list.Count));
        }

        public Task AddAsync(MediaAsset asset, CancellationToken ct = default) => Task.CompletedTask;
        public Task SaveChangesAsync(CancellationToken ct = default) => Task.CompletedTask;
    }

    private sealed class FakeRecipeContextClient : IRecipeContextClient
    {
        public List<MediaAssetUsageItem> UsagesToReturn { get; set; } = new();
        public List<RecipeVersionEligibilityItem> EligibilityToReturn { get; set; } = new();

        public Task<RecipeAiContextResult> GetRecipeAiContextAsync(Guid recipeVersionId, Guid? recipeStepId, string targetKind, CancellationToken ct = default)
        {
            return Task.FromResult(new RecipeAiContextResult(
                true,
                null,
                null,
                Guid.NewGuid(),
                recipeVersionId,
                "Recipe",
                "Description",
                "Category",
                1L,
                "Approved",
                recipeStepId,
                1,
                null,
                null,
                Array.Empty<RecipeIngredientSnapshot>()));
        }

        public Task<IReadOnlyList<MediaAssetUsageItem>> GetMediaUsagesAsync(Guid assetId, CancellationToken ct = default)
        {
            return Task.FromResult<IReadOnlyList<MediaAssetUsageItem>>(UsagesToReturn);
        }

        public Task<IReadOnlyList<RecipeVersionEligibilityItem>> GetRecipeVersionsEligibilityAsync(IEnumerable<Guid> recipeVersionIds, CancellationToken ct = default)
        {
            return Task.FromResult<IReadOnlyList<RecipeVersionEligibilityItem>>(EligibilityToReturn);
        }
    }

    private sealed class FakeDraftRepository : IImageDraftRepository
    {
        public Task AddAsync(AiImageDraft draft, CancellationToken ct = default) => Task.CompletedTask;
        public Task<AiImageDraft?> GetByIdAsync(long id, CancellationToken ct = default) => Task.FromResult<AiImageDraft?>(null);
        public Task<AiImageDraft?> GetByPublicIdAsync(Guid publicId, CancellationToken ct = default) => Task.FromResult<AiImageDraft?>(null);
        public Task<AiImageDraft?> GetLatestActiveForTargetAsync(Guid recipeVersionRef, Guid? recipeStepRef, CancellationToken ct = default) => Task.FromResult<AiImageDraft?>(null);
        public Task<(IReadOnlyList<AiImageDraft> Items, int TotalCount)> ListAsync(Guid? recipeVersionRef, Guid? recipeStepRef, string? state, int page, int pageSize, CancellationToken ct = default) => Task.FromResult(((IReadOnlyList<AiImageDraft>)Array.Empty<AiImageDraft>(), 0));
        public Task SaveChangesAsync(CancellationToken ct = default) => Task.CompletedTask;
    }

    private sealed class FakeOutboxRepository : IOutboxRepository
    {
        public Task AddAsync(OutboxMessage message, CancellationToken ct = default) => Task.CompletedTask;
        public Task<IReadOnlyList<OutboxMessage>> GetPendingMessagesAsync(int batchSize, CancellationToken ct = default) => Task.FromResult<IReadOnlyList<OutboxMessage>>(Array.Empty<OutboxMessage>());
        public Task SaveChangesAsync(CancellationToken ct = default) => Task.CompletedTask;
    }

    private sealed class FakeUnitOfWork : IContentUnitOfWork
    {
        public async Task ExecuteInTransactionAsync(Func<Task> action, CancellationToken ct = default) => await action();
        public Task SaveChangesAsync(CancellationToken ct = default) => Task.CompletedTask;
    }

    private sealed class FakeMediaStorage : IMediaStorage
    {
        public Task<StoredMediaResult> UploadAsync(Stream stream, string fileName, string contentType, string folder, CancellationToken ct = default)
        {
            return Task.FromResult(new StoredMediaResult("provider_id", "https://cdn/test.jpg", 800, 600, 1024L));
        }

        public Task<bool> DeleteAsync(string providerPublicId, CancellationToken ct = default) => Task.FromResult(true);
    }
}
