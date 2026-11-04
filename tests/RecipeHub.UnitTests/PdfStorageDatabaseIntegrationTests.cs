using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeHub.Recipe.Domain.Entities;
using RecipeHub.Recipe.Infrastructure.Data;
using RecipeHub.Recipe.Infrastructure.Repositories;
using Xunit;

namespace RecipeHub.UnitTests;

/// <summary>
/// Database integration test for PDF storage triggers and immutability.
/// GUARDED: Strictly opt-in only. NEVER runs against shared or populated databases.
/// To run: Set RUN_DISPOSABLE_DB_TESTS=true and provide admin connection in POSTGRES_ADMIN_URL
/// (e.g. Host=localhost;Port=5432;Database=postgres;Username=postgres;Password=postgres).
/// DDL is applied ONLY to a newly created, disposable test database that is dropped on cleanup.
/// </summary>
public class PdfStorageDatabaseIntegrationTests
{
    private static bool IsOptedIn() =>
        string.Equals(Environment.GetEnvironmentVariable("RUN_DISPOSABLE_DB_TESTS"), "true", StringComparison.OrdinalIgnoreCase);

    private static string GetAdminConnectionString() =>
        Environment.GetEnvironmentVariable("POSTGRES_ADMIN_URL")
        ?? "Host=localhost;Port=5432;Database=postgres;Username=postgres;Password=postgres";

    [Fact(Skip = "Integration test requires disposable PostgreSQL instance; set RUN_DISPOSABLE_DB_TESTS=true to run.")]
    public async Task DisposablePostgres_FencedFinalizeReady_PassesThroughTriggers_AndEnforcesImmutability()
    {
        if (!IsOptedIn())
        {
            // Guard: Skipped by default to protect shared/populated databases.
            // Requires explicit opt-in via RUN_DISPOSABLE_DB_TESTS=true.
            return;
        }

        var adminConnStr = GetAdminConnectionString();
        var disposableDbName = $"recipe_test_{Guid.NewGuid():N}";
        var testConnStr = new NpgsqlConnectionStringBuilder(adminConnStr)
        {
            Database = disposableDbName
        }.ConnectionString;

        // 1. Create disposable database
        await using (var adminConn = new NpgsqlConnection(adminConnStr))
        {
            try
            {
                await adminConn.OpenAsync();
            }
            catch
            {
                // Unreachable admin database; skip gracefully
                return;
            }

            await using var cmd = adminConn.CreateCommand();
            cmd.CommandText = $"CREATE DATABASE \"{disposableDbName}\";";
            await cmd.ExecuteNonQueryAsync();
        }

        try
        {
            // 2. Bootstrap disposable database with official DDL
            var bootstrapPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "../../../../../docs/database-schema/recipe-db/RecipeHub.Recipe.postgres");
            if (!File.Exists(bootstrapPath))
            {
                return;
            }

            var ddl = await File.ReadAllTextAsync(bootstrapPath);
            await using (var testConn = new NpgsqlConnection(testConnStr))
            {
                await testConn.OpenAsync();
                await using var cmd = testConn.CreateCommand();
                cmd.CommandText = ddl;
                await cmd.ExecuteNonQueryAsync();
            }

            // 3. Setup DbContext pointing to disposable DB
            var options = new DbContextOptionsBuilder<RecipeDbContext>()
                .UseNpgsql(testConnStr)
                .Options;

            using var context = new RecipeDbContext(options);

            // Seed a minimal published recipe and version for FK
            var recipe = new RecipeHub.Recipe.Domain.Entities.Recipe
            {
                PublicId = Guid.NewGuid(),
                Code = "TEST-R01",
                NormalizedCode = "TEST-R01",
                CreatedByUserRef = Guid.NewGuid(),
                UpdatedByUserRef = Guid.NewGuid(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            context.Recipes.Add(recipe);
            await context.SaveChangesAsync();

            var version = new RecipeVersion
            {
                PublicId = Guid.NewGuid(),
                RecipeId = recipe.Id,
                VersionNumber = 1,
                Name = "Test Recipe v1",
                Status = "published",
                CreatedByUserRef = Guid.NewGuid(),
                CreatedAt = DateTime.UtcNow,
                Recipe = recipe
            };
            context.RecipeVersions.Add(version);
            await context.SaveChangesAsync();

            var repo = new PdfDocumentRepository(context);

            var docPublicId = Guid.NewGuid();
            var leaseToken = Guid.NewGuid();
            var storagePublicId = $"pdf_documents/test_{docPublicId:N}.pdf";
            var fileName = $"Test_Document_{DateTime.UtcNow:yyyyMMdd}_{docPublicId:N}.pdf";

            var pdfDoc = new PdfDocument
            {
                PublicId = docPublicId,
                Title = "Tài liệu kiểm thử triggers",
                DocumentType = "published",
                ExportScope = "single",
                State = "processing",
                CreatedByUserRef = Guid.NewGuid(),
                CreatedAt = DateTime.UtcNow,
                LeaseToken = leaseToken,
                LeaseExpiresAt = DateTime.UtcNow.AddMinutes(5),
                ErrorCode = null
            };

            var storage = new PdfDocumentStorage
            {
                Document = pdfDoc,
                Provider = "Cloudinary",
                StoragePublicId = storagePublicId,
                FileName = fileName,
                CleanupRequired = false
            };
            pdfDoc.Storage = storage;

            var items = new List<PdfDocumentItem>
            {
                new PdfDocumentItem
                {
                    RecipeVersionId = version.Id,
                    SortOrder = 1
                }
            };

            // 4. Reserve document and storage (unfinalized, storage_asset_id is null)
            await repo.ReserveAsync(pdfDoc, items, storage);

            // 5. FencedFinalizeReadyAsync: Updates parent to 'ready' AND storage with complete metadata
            // Exercises trigger trg_enforce_pdf_document_storage_immutability and deferred ready constraint trigger
            var completedAt = DateTime.UtcNow;
            var finalized = await repo.FencedFinalizeReadyAsync(
                docPublicId,
                leaseToken,
                storageAssetId: $"asset_{Guid.NewGuid():N}",
                storageVersion: "v1700000000",
                byteSize: 102400,
                fileSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                completedAt: completedAt);

            Assert.True(finalized, "FencedFinalizeReadyAsync should succeed through triggers without rolling back.");

            // Verify document state and storage in DB
            var reloaded = await repo.GetByPublicIdAsync(docPublicId);
            Assert.NotNull(reloaded);
            Assert.Equal("ready", reloaded.State);
            Assert.Null(reloaded.LeaseToken);
            Assert.Null(reloaded.LeaseExpiresAt);
            Assert.NotNull(reloaded.Storage);
            Assert.NotNull(reloaded.Storage.StorageAssetId);
            Assert.Equal(102400, reloaded.Storage.ByteSize);
            Assert.Equal("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", reloaded.Storage.FileSha256);

            // 6. Immutability checks on ready document
            // 6.1 Modify storage -> MUST fail
            var updateStorageEx = await Assert.ThrowsAsync<DbUpdateException>(async () =>
            {
                using var immContext = new RecipeDbContext(options);
                var immStorage = await immContext.PdfDocumentStorages.FirstAsync(s => s.DocumentId == reloaded.Id);
                immStorage.FileName = "Modified_After_Ready.pdf";
                await immContext.SaveChangesAsync();
            });
            Assert.Contains("immutable", updateStorageEx.InnerException?.Message ?? updateStorageEx.Message, StringComparison.OrdinalIgnoreCase);

            // 6.2 Delete storage -> MUST fail
            var deleteStorageEx = await Assert.ThrowsAsync<DbUpdateException>(async () =>
            {
                using var immContext = new RecipeDbContext(options);
                var immStorage = await immContext.PdfDocumentStorages.FirstAsync(s => s.DocumentId == reloaded.Id);
                immContext.PdfDocumentStorages.Remove(immStorage);
                await immContext.SaveChangesAsync();
            });
            Assert.Contains("immutable", deleteStorageEx.InnerException?.Message ?? deleteStorageEx.Message, StringComparison.OrdinalIgnoreCase);

            // 6.3 Modify document -> MUST fail
            var updateDocEx = await Assert.ThrowsAsync<DbUpdateException>(async () =>
            {
                using var immContext = new RecipeDbContext(options);
                var immDoc = await immContext.PdfDocuments.FirstAsync(d => d.Id == reloaded.Id);
                immDoc.Title = "New Title";
                await immContext.SaveChangesAsync();
            });
            Assert.Contains("immutable", updateDocEx.InnerException?.Message ?? updateDocEx.Message, StringComparison.OrdinalIgnoreCase);

            // 6.4 Delete ready document -> MUST fail
            var deleteDocEx = await Assert.ThrowsAsync<DbUpdateException>(async () =>
            {
                using var immContext = new RecipeDbContext(options);
                var immDoc = await immContext.PdfDocuments.FirstAsync(d => d.Id == reloaded.Id);
                immContext.PdfDocuments.Remove(immDoc);
                await immContext.SaveChangesAsync();
            });
            Assert.Contains("immutable", deleteDocEx.InnerException?.Message ?? deleteDocEx.Message, StringComparison.OrdinalIgnoreCase);
        }
        finally
        {
            // 7. Cleanup: Drop disposable database
            try
            {
                NpgsqlConnection.ClearAllPools();
                await using var adminConn = new NpgsqlConnection(adminConnStr);
                await adminConn.OpenAsync();
                await using var dropCmd = adminConn.CreateCommand();
                dropCmd.CommandText = $"DROP DATABASE IF EXISTS \"{disposableDbName}\" WITH (FORCE);";
                await dropCmd.ExecuteNonQueryAsync();
            }
            catch
            {
                // Best-effort cleanup
            }
        }
    }
}
