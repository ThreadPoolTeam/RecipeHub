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
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:5004
EXPOSE 5004
ENTRYPOINT ["dotnet", "RecipeHub.Audit.Api.dll"]
