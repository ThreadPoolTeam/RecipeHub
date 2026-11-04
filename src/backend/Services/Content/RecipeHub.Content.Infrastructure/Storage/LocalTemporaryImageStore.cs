using Microsoft.Extensions.Configuration;
using RecipeHub.Content.Application.Interfaces;

namespace RecipeHub.Content.Infrastructure.Storage;

public sealed class LocalTemporaryImageStore : ITemporaryImageStore
{
    private readonly string _basePath;

    public LocalTemporaryImageStore(IConfiguration configuration)
    {
        var configuredPath = configuration["TemporaryStorage:BasePath"];
        if (string.IsNullOrWhiteSpace(configuredPath))
        {
            _basePath = Path.Combine(Path.GetTempPath(), "recipehub", "temp-drafts");
        }
        else if (Path.IsPathRooted(configuredPath))
        {
            _basePath = configuredPath;
        }
        else
        {
            _basePath = Path.Combine(Path.GetTempPath(), "recipehub", configuredPath);
        }

        if (!Directory.Exists(_basePath))
        {
            Directory.CreateDirectory(_basePath);
        }
    }

    public async Task<string> SaveTemporaryImageAsync(Guid draftId, byte[] bytes, string extension, CancellationToken ct = default)
    {
        if (!extension.StartsWith('.'))
        {
            extension = "." + extension;
        }

        var relativePath = $"{draftId:N}{extension}";
        var fullPath = Path.Combine(_basePath, relativePath);

        await File.WriteAllBytesAsync(fullPath, bytes, ct);
        return relativePath;
    }
    public Task<Stream?> OpenReadAsync(string relativePath, CancellationToken ct = default)
    {
        var fullPath = GetSafeFullPath(relativePath);
        if (!File.Exists(fullPath))
        {
            return Task.FromResult<Stream?>(null);
        }

        var stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
        return Task.FromResult<Stream?>(stream);
    }

    public Task DeleteAsync(string relativePath, CancellationToken ct = default)
    {
        var fullPath = GetSafeFullPath(relativePath);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }
        return Task.CompletedTask;
    }

    public bool Exists(string relativePath)
    {
        var fullPath = GetSafeFullPath(relativePath);
        return File.Exists(fullPath);
    }

    private string GetSafeFullPath(string relativePath)
    {
        var fileName = Path.GetFileName(relativePath);
        return Path.Combine(_basePath, fileName);
    }
}
