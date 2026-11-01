using System;
using System.Collections.Generic;

namespace RecipeHub.Recipe.Application.DTOs;

public class PreviewPdfRequest
{
    public string DocumentType { get; set; } = "draft"; // draft | published
    public string Title { get; set; } = null!;
    public string? Subtitle { get; set; }
    public string TemplateCode { get; set; } = "detailed-landscape";
    public string TemplateVersion { get; set; } = "1";
    public List<PdfDocumentRequestItem> Items { get; set; } = new();
}

public class ExportPdfRequest
{
    public string ExpectedSnapshotHash { get; set; } = null!;
    public string DocumentType { get; set; } = "draft"; // draft | published
    public string Title { get; set; } = null!;
    public string? Subtitle { get; set; }
    public string TemplateCode { get; set; } = "detailed-landscape";
    public string TemplateVersion { get; set; } = "1";
    public List<PdfDocumentRequestItem> Items { get; set; } = new();
}

public class PdfDocumentRequestItem
{
    public Guid RecipeId { get; set; }
    public Guid RecipeVersionId { get; set; }
    public string? TitleOverride { get; set; }
    public Guid? CoverMediaAssetId { get; set; }
    public List<PdfDocumentStepRequestItem> Steps { get; set; } = new();
}

public class PdfDocumentStepRequestItem
{
    public Guid StepId { get; set; }
    public List<PdfDocumentStepMediaRequestItem> Media { get; set; } = new();
}

public class PdfDocumentStepMediaRequestItem
{
    public Guid AssetId { get; set; }
    public string? Caption { get; set; }
}

public class PdfDocumentResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; } = null!;
    public string DocumentType { get; set; } = null!; // draft | published
    public string ExportScope { get; set; } = null!; // single | collection
    public string State { get; set; } = null!; // processing | ready | failed
    public string TemplateCode { get; set; } = null!;
    public string TemplateVersion { get; set; } = null!;
    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string FileName { get; set; } = null!;
    public long? ByteSize { get; set; }
    public string? Sha256 { get; set; }
    public int ItemCount { get; set; }
    public string? ErrorCode { get; set; }
    public List<PdfDocumentItemResponse> Items { get; set; } = new();
}

public class PdfDocumentItemResponse
{
    public Guid RecipeVersionId { get; set; }
    public string RecipeCode { get; set; } = null!;
    public int VersionNumber { get; set; }
    public string RecipeName { get; set; } = null!;
    public int SortOrder { get; set; }
}

public class PdfDocumentSummaryResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; } = null!;
    public string DocumentType { get; set; } = null!;
    public string ExportScope { get; set; } = null!;
    public string State { get; set; } = null!;
    public string TemplateCode { get; set; } = null!;
    public string TemplateVersion { get; set; } = null!;
    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string FileName { get; set; } = null!;
    public long? ByteSize { get; set; }
    public string? Sha256 { get; set; }
    public int ItemCount { get; set; }
    public string? ErrorCode { get; set; }
}

public class PdfCapabilitiesResponse
{
    public List<string> Templates { get; set; } = new() { "detailed-landscape" };
    public string DefaultTemplate { get; set; } = "detailed-landscape";
    public string TemplateVersion { get; set; } = "1";
    public string Orientation { get; set; } = "landscape";
    public int MaxItems { get; set; } = 50;
    public long MaxPdfBytes { get; set; } = 52428800; // 50 MiB
    public long MaxMediaBytes { get; set; } = 10485760; // 10 MiB per image
    public int MaxMediaPixels { get; set; } = 16000000; // 16 MP
    public int MaxConcurrentExports { get; set; } = 2;
    public int MaxTitleLength { get; set; } = 200;
    public int MaxSubtitleLength { get; set; } = 300;
    public int MaxCaptionLength { get; set; } = 1000;
}

public class PublishedDocumentLookupResponse
{
    public Guid Id { get; set; }
    public Guid RecipeVersionId { get; set; }
    public string Title { get; set; } = null!;
    public string FileName { get; set; } = null!;
    public long ByteSize { get; set; }
    public string Sha256 { get; set; } = null!;
    public DateTime CompletedAt { get; set; }
}
