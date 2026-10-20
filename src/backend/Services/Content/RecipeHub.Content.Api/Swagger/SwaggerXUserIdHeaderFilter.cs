using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace RecipeHub.Content.Api.Swagger;

public sealed class SwaggerXUserIdHeaderFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        operation.Parameters ??= new List<OpenApiParameter>();
        operation.Parameters.Add(new OpenApiParameter
        {
            Name = "X-User-Id",
            In = ParameterLocation.Header,
            Required = true,
            Schema = new OpenApiSchema
            {
                Type = "string",
                Format = "uuid",
                Default = new OpenApiString("00000000-0000-0000-0000-000000000001")
            },
            Description = "Actor User ID (UUID) for authorization & audit tracking"
        });
    }
}
