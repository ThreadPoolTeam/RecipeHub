using System.Security.Claims;
using RecipeHub.BuildingBlocks.Audit;

namespace RecipeHub.Recipe.Api;

public static class RequestActor
{
    public static AuditActor GetActor(HttpContext context)
    {
        var idClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(idClaim, out var userId) || userId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("Cần JWT session Identity hợp lệ.");
        }

        var name = context.User.FindFirst(ClaimTypes.Name)?.Value;
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new UnauthorizedAccessException("Không tìm thấy thông tin tên người dùng trong phiên đăng nhập.");
        }

        var role = context.User.FindFirst(ClaimTypes.Role)?.Value;
        if (string.IsNullOrWhiteSpace(role))
        {
            throw new UnauthorizedAccessException("Không tìm thấy vai trò người dùng trong phiên đăng nhập.");
        }

        return new AuditActor(userId, name.Trim(), role.Trim().ToLowerInvariant());
    }

    public static Guid GetUserId(HttpContext context) => GetActor(context).Id;
}
