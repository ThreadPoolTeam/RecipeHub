using System;
using System.Collections.Generic;

namespace RecipeHub.Recipe.Domain.Entities;

public class PdfDocument
{
    public long Id { get; set; }
    public Guid PublicId { get; set; }
    public string Title { get; set; } = null!;
    public string DocumentType { get; set; } = null!; // draft | published
    public string ExportScope { get; set; } = null!; // single | collection
    public string State { get; set; } = null!; // processing | ready | failed
    public string TemplateCode { get; set; } = null!;
    public string TemplateVersion { get; set; } = null!;
    public string PresentationSnapshot { get; set; } = null!; // jsonb
    public string SnapshotSha256 { get; set; } = null!;
    public Guid CreatedByUserRef { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public Guid? LeaseToken { get; set; }
    public DateTime? LeaseExpiresAt { get; set; }
    public string StorageProvider { get; set; } = "Cloudinary";
    public string StoragePublicId { get; set; } = null!;
    public string? StorageAssetId { get; set; }
    public string? StorageVersion { get; set; }
    public string StorageResourceType { get; set; } = "raw";
    public string StorageDeliveryType { get; set; } = "authenticated";
    public string FileName { get; set; } = null!;
    public long? ByteSize { get; set; }
    public string? FileSha256 { get; set; }
    public string? ErrorCode { get; set; }
    public bool StorageCleanupRequired { get; set; }
    public Guid AuditEventId { get; set; }
    public DateTime? AuditPublishedAt { get; set; }
    public DateTime? AuditRecordedAt { get; set; }

    public virtual ICollection<PdfDocumentItem> Items { get; set; } = new List<PdfDocumentItem>();
}
