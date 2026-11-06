FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY Directory.Build.props ./
COPY BuildingBlocks/ ./BuildingBlocks/
COPY Contracts/ ./Contracts/
COPY Services/Audit/ ./Services/Audit/

RUN dotnet restore Services/Audit/RecipeHub.Audit.Api/RecipeHub.Audit.Api.csproj
RUN dotnet publish Services/Audit/RecipeHub.Audit.Api/RecipeHub.Audit.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/publish .
EXPOSE 5004
ENTRYPOINT ["dotnet", "RecipeHub.Audit.Api.dll"]
