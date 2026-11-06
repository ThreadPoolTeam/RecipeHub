using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RecipeHub.Recipe.Application.DTOs;
using RecipeHub.Recipe.Application.Interfaces;

namespace RecipeHub.Recipe.Api.Controllers;

[ApiController]
[Route("api/v1/recipes/documents")]
public sealed class PdfDocumentsController : ControllerBase
{
    private readonly IPdfDocumentService _documentService;

    public PdfDocumentsController(IPdfDocumentService documentService)
    {
        _documentService = documentService;
    }

    [HttpGet("capabilities")]
    [ProducesResponseType(typeof(PdfCapabilitiesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<PdfCapabilitiesResponse>> GetCapabilities(CancellationToken cancellationToken)
    {
        var capabilities = await _documentService.GetCapabilitiesAsync(cancellationToken);
        return Ok(capabilities);
    }

    [HttpPost("preview")]
    [ProducesResponseType(typeof(FileStreamResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Preview(
        [FromBody] PreviewPdfRequest request,
        CancellationToken cancellationToken)
    {
        if (User.IsInRole("viewer"))
        {
            return Forbid();
        }

        var token = GetBearerToken();
        var result = await _documentService.GeneratePreviewAsync(request, token, cancellationToken);

        Response.Headers["X-Pdf-Snapshot-Hash"] = result.SnapshotHash;
        Response.Headers["Access-Control-Expose-Headers"] = "X-Pdf-Snapshot-Hash, Content-Disposition";
        Response.Headers["Cache-Control"] = "private, no-store";

        return File(result.PdfStream, "application/pdf");
    }

    [HttpPost]
    [ProducesResponseType(typeof(PdfDocumentResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status502BadGateway)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status504GatewayTimeout)]
    public async Task<ActionResult<PdfDocumentResponse>> Export(
        [FromBody] ExportPdfRequest request,
        CancellationToken cancellationToken)
    {
        if (User.IsInRole("viewer"))
        {
            return Forbid();
        }

        var userId = RequestActor.GetUserId(HttpContext);
        var token = GetBearerToken();

        var response = await _documentService.ExportDocumentAsync(request, userId, token, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { documentId = response.Id }, response);
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResponse<PdfDocumentSummaryResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PagedResponse<PdfDocumentSummaryResponse>>> GetHistory(
        [FromQuery] string? search,
        [FromQuery] string? documentType,
        [FromQuery] string? exportScope,
        [FromQuery] string? state,
        [FromQuery] Guid? recipeVersionId,
        [FromQuery] Guid? createdByUserId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        if (User.IsInRole("viewer"))
        {
            return Forbid();
        }

        var (items, totalCount) = await _documentService.GetHistoryAsync(
            search,
            documentType,
            exportScope,
            state,
            recipeVersionId,
            createdByUserId,
            fromDate,
            toDate,
            page,
            pageSize,
            cancellationToken);

        return Ok(new PagedResponse<PdfDocumentSummaryResponse>(items, page, pageSize, totalCount));
    }

    [HttpGet("{documentId:guid}")]
    [ProducesResponseType(typeof(PdfDocumentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PdfDocumentResponse>> GetById(
        Guid documentId,
        CancellationToken cancellationToken)
    {
        if (User.IsInRole("viewer"))
        {
            return Forbid();
        }

        var doc = await _documentService.GetByIdAsync(documentId, cancellationToken);
        if (doc == null)
        {
            return NotFound();
        }

        return Ok(doc);
    }

    [HttpGet("{documentId:guid}/file")]
    [ProducesResponseType(typeof(FileStreamResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status502BadGateway)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status504GatewayTimeout)]
    public async Task<IActionResult> DownloadFile(
        Guid documentId,
        [FromQuery] string disposition = "inline",
        CancellationToken cancellationToken = default)
    {
        var userId = RequestActor.GetUserId(HttpContext);
        var role = User.IsInRole("admin") ? "admin" : (User.IsInRole("rnd") ? "rnd" : (User.IsInRole("viewer") ? "viewer" : "unknown"));

        var fileResult = await _documentService.GetFileStreamAsync(documentId, role, userId, cancellationToken);
        if (fileResult == null)
        {
            return NotFound();
        }

        var safeDisposition = string.Equals(disposition, "attachment", StringComparison.OrdinalIgnoreCase) ? "attachment" : "inline";
        var contentDisposition = new Microsoft.Net.Http.Headers.ContentDispositionHeaderValue(safeDisposition);
        contentDisposition.SetHttpFileName(fileResult.FileName);
        Response.Headers["Content-Disposition"] = contentDisposition.ToString();
        Response.Headers["Cache-Control"] = "private, no-store";

        return File(fileResult.Stream, fileResult.ContentType);
    }

    [HttpGet("/api/v1/recipes/{versionId:guid}/published-document")]
    [ProducesResponseType(typeof(PublishedDocumentLookupResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PublishedDocumentLookupResponse>> GetPublishedDocumentForVersion(
        Guid versionId,
        CancellationToken cancellationToken)
    {
        var doc = await _documentService.GetPublishedForVersionAsync(versionId, cancellationToken);
        if (doc == null)
        {
            return NotFound();
        }

        return Ok(doc);
    }

    private string? GetBearerToken()
    {
        if (Request.Headers.TryGetValue("Authorization", out var authHeader))
        {
            var headerValue = authHeader.ToString();
            if (headerValue.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                return headerValue.Substring("Bearer ".Length).Trim();
            }
            return headerValue.Trim();
        }
        return null;
    }
}
