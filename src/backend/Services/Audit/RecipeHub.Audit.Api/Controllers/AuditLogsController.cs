using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecipeHub.Audit.Application.DTOs;
using RecipeHub.Audit.Application.Services;

namespace RecipeHub.Audit.Api.Controllers;

[ApiController]
[Route("api/v1/audit/logs")]
[Authorize(Roles = "admin")]
public class AuditLogsController : ControllerBase
{
    private readonly AuditLogService _auditLogService;

    public AuditLogsController(AuditLogService auditLogService)
    {
        _auditLogService = auditLogService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(AuditLogListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<AuditLogListResponse>> GetLogs([FromQuery] AuditLogQuery query, CancellationToken ct)
    {
        try
        {
            var result = await _auditLogService.GetAuditLogsAsync(query, ct);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Type = "https://recipehub.vn/errors/invalid-audit-query",
                Title = "Tham số truy vấn không hợp lệ",
                Status = StatusCodes.Status400BadRequest,
                Detail = ex.Message,
                Instance = HttpContext.Request.Path
            });
        }
    }
}
