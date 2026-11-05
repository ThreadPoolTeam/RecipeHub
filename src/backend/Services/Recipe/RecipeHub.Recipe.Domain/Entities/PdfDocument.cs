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
    public Guid CreatedByUserRef { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public Guid? LeaseToken { get; set; }
    public DateTime? LeaseExpiresAt { get; set; }
    public string? ErrorCode { get; set; }

    public virtual PdfDocumentStorage? Storage { get; set; }
    public virtual ICollection<PdfDocumentItem> Items { get; set; } = new List<PdfDocumentItem>();
}
