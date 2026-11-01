using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using RecipeHub.Recipe.Application;
using RecipeHub.Recipe.Infrastructure.Storage;
using Xunit;

namespace RecipeHub.UnitTests;

public sealed class CloudinaryPdfStorageTests
{
    private sealed class DelegatingHandlerStub : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _handler;

        public DelegatingHandlerStub(Func<HttpRequestMessage, HttpResponseMessage> handler)
        {
            _handler = handler;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromResult(_handler(request));
        }
    }

    private static IConfiguration CreateConfig()
    {
        return new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Cloudinary:CloudName"] = "demo-cloud",
                ["Cloudinary:ApiKey"] = "demo-key",
                ["Cloudinary:ApiSecret"] = "demo-secret"
            })
            .Build();
    }

    [Fact]
    public async Task DestroyAsync_Succeeds_WhenResultIsOk()
    {
        var handler = new DelegatingHandlerStub(req => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("{\"result\":\"ok\"}", Encoding.UTF8, "application/json")
        });

        var storage = new CloudinaryPdfStorage(
            new HttpClient(handler),
            CreateConfig(),
            NullLogger<CloudinaryPdfStorage>.Instance);

        var ex = await Record.ExceptionAsync(() => storage.DestroyAsync("test-public-id", CancellationToken.None));
        Assert.Null(ex);
    }

    [Fact]
    public async Task DestroyAsync_Succeeds_WhenResultIsNotFound()
    {
        var handler = new DelegatingHandlerStub(req => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("{\"result\":\"not found\"}", Encoding.UTF8, "application/json")
        });

        var storage = new CloudinaryPdfStorage(
            new HttpClient(handler),
            CreateConfig(),
            NullLogger<CloudinaryPdfStorage>.Instance);

        var ex = await Record.ExceptionAsync(() => storage.DestroyAsync("test-public-id", CancellationToken.None));
        Assert.Null(ex);
    }

    [Fact]
    public async Task DestroyAsync_Throws_WhenHttpNonSuccess()
    {
        var handler = new DelegatingHandlerStub(req => new HttpResponseMessage(HttpStatusCode.InternalServerError)
        {
            Content = new StringContent("{\"error\":\"internal error\"}", Encoding.UTF8, "application/json")
        });

        var storage = new CloudinaryPdfStorage(
            new HttpClient(handler),
            CreateConfig(),
            NullLogger<CloudinaryPdfStorage>.Instance);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            storage.DestroyAsync("test-public-id", CancellationToken.None));

        Assert.Contains("500", ex.Message);
    }

    [Fact]
    public async Task DestroyAsync_Throws_WhenResultIsNotOk()
    {
        var handler = new DelegatingHandlerStub(req => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("{\"result\":\"server_error\"}", Encoding.UTF8, "application/json")
        });

        var storage = new CloudinaryPdfStorage(
            new HttpClient(handler),
            CreateConfig(),
            NullLogger<CloudinaryPdfStorage>.Instance);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            storage.DestroyAsync("test-public-id", CancellationToken.None));

        Assert.Contains("server_error", ex.Message);
    }

    [Fact]
    public async Task DestroyAsync_Throws_WhenResultMissingOrInvalidJson()
    {
        var handler = new DelegatingHandlerStub(req => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("<html>Gateway Timeout</html>", Encoding.UTF8, "text/html")
        });

        var storage = new CloudinaryPdfStorage(
            new HttpClient(handler),
            CreateConfig(),
            NullLogger<CloudinaryPdfStorage>.Instance);

        await Assert.ThrowsAnyAsync<Exception>(() =>
            storage.DestroyAsync("test-public-id", CancellationToken.None));
    }

    private static CloudinaryPdfStorage CreateStorage(HttpStatusCode status, string body)
    {
        var handler = new DelegatingHandlerStub(_ => new HttpResponseMessage(status)
        {
            Content = new StringContent(body)
        });
        return new CloudinaryPdfStorage(new HttpClient(handler), CreateConfig(), NullLogger<CloudinaryPdfStorage>.Instance);
    }

    [Theory]
    [InlineData(HttpStatusCode.Unauthorized, PdfStorageFailure.Failed)]
    [InlineData(HttpStatusCode.Forbidden, PdfStorageFailure.Failed)]
    [InlineData(HttpStatusCode.InternalServerError, PdfStorageFailure.Failed)]
    [InlineData(HttpStatusCode.TooManyRequests, PdfStorageFailure.Unavailable)]
    [InlineData(HttpStatusCode.ServiceUnavailable, PdfStorageFailure.Unavailable)]
    [InlineData(HttpStatusCode.RequestTimeout, PdfStorageFailure.Timeout)]
    [InlineData(HttpStatusCode.GatewayTimeout, PdfStorageFailure.Timeout)]
    public async Task Download_ClassifiesUpstreamErrors_WithoutExposingBody(HttpStatusCode status, PdfStorageFailure expected)
    {
        var storage = CreateStorage(status, "{\"error\":\"private upstream configuration\"}");
        var error = await Assert.ThrowsAsync<PdfStorageException>(() => storage.OpenDownloadStreamAsync("document.pdf"));
        Assert.Equal(expected, error.Failure);
        Assert.DoesNotContain("private upstream configuration", error.Message);
    }

    [Fact]
    public async Task Download_MissingCloudFile_IsNotFound()
    {
        var storage = CreateStorage(HttpStatusCode.NotFound, "{}");
        await Assert.ThrowsAsync<NotFoundException>(() => storage.OpenDownloadStreamAsync("deleted.pdf"));
    }

    [Theory]
    [InlineData(HttpStatusCode.Unauthorized, PdfStorageFailure.Failed)]
    [InlineData(HttpStatusCode.NotFound, PdfStorageFailure.Failed)]
    [InlineData(HttpStatusCode.TooManyRequests, PdfStorageFailure.Unavailable)]
    [InlineData(HttpStatusCode.GatewayTimeout, PdfStorageFailure.Timeout)]
    public async Task Upload_ClassifiesUpstreamErrors(HttpStatusCode status, PdfStorageFailure expected)
    {
        var storage = CreateStorage(status, "{}");
        using var pdf = new MemoryStream("%PDF-test"u8.ToArray());
        var error = await Assert.ThrowsAsync<PdfStorageException>(() => storage.UploadPdfAsync("document.pdf", pdf));
        Assert.Equal(expected, error.Failure);
    }

    [Theory]
    [InlineData("not-json")]
    [InlineData("[]")]
    [InlineData("{\"public_id\":123}")]
    [InlineData("{\"public_id\":\"id\",\"asset_id\":null}")]
    [InlineData("{\"public_id\":\"id\",\"asset_id\":\"asset\",\"version\":1,\"bytes\":\"invalid\"}")]
    public async Task Upload_InvalidProviderResponse_IsStorageFailure(string body)
    {
        var storage = CreateStorage(HttpStatusCode.OK, body);
        using var pdf = new MemoryStream("%PDF-test"u8.ToArray());
        var error = await Assert.ThrowsAsync<PdfStorageException>(() => storage.UploadPdfAsync("document.pdf", pdf));
        Assert.Equal(PdfStorageFailure.Failed, error.Failure);
    }

    [Fact]
    public async Task Download_MissingConfiguration_IsUnavailable()
    {
        using var client = new HttpClient(new DelegatingHandlerStub(_ => throw new InvalidOperationException("Must not send.")));
        var storage = new CloudinaryPdfStorage(client, new ConfigurationBuilder().Build(), NullLogger<CloudinaryPdfStorage>.Instance);
        var error = await Assert.ThrowsAsync<PdfStorageException>(() => storage.OpenDownloadStreamAsync("document.pdf"));
        Assert.Equal(PdfStorageFailure.Unavailable, error.Failure);
    }

    [Fact]
    public async Task Download_NetworkFailure_IsStorageFailure()
    {
        using var client = new HttpClient(new DelegatingHandlerStub(_ => throw new HttpRequestException("Connection refused")));
        var storage = new CloudinaryPdfStorage(client, CreateConfig(), NullLogger<CloudinaryPdfStorage>.Instance);
        var error = await Assert.ThrowsAsync<PdfStorageException>(() => storage.OpenDownloadStreamAsync("document.pdf"));
        Assert.Equal(PdfStorageFailure.Failed, error.Failure);
    }

    [Fact]
    public async Task Download_ProviderTimeout_IsNotCallerCancellation()
    {
        using var client = new HttpClient(new DelegatingHandlerStub(_ => throw new TaskCanceledException("Provider timed out")));
        var storage = new CloudinaryPdfStorage(client, CreateConfig(), NullLogger<CloudinaryPdfStorage>.Instance);
        var error = await Assert.ThrowsAsync<PdfStorageException>(() => storage.OpenDownloadStreamAsync("document.pdf"));
        Assert.Equal(PdfStorageFailure.Timeout, error.Failure);
    }

    [Fact]
    public async Task Download_CallerCancellation_IsNotStorageFailure()
    {
        using var client = new HttpClient(new DelegatingHandlerStub(_ => throw new TaskCanceledException()));
        var storage = new CloudinaryPdfStorage(client, CreateConfig(), NullLogger<CloudinaryPdfStorage>.Instance);
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => storage.OpenDownloadStreamAsync("document.pdf", cancellation.Token));
    }
}
