FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY Directory.Build.props ./
COPY BuildingBlocks/ ./BuildingBlocks/
COPY Contracts/ ./Contracts/
COPY Services/Identity/ ./Services/Identity/

RUN dotnet restore Services/Identity/RecipeHub.Identity.Api/RecipeHub.Identity.Api.csproj
RUN dotnet publish Services/Identity/RecipeHub.Identity.Api/RecipeHub.Identity.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:5001
EXPOSE 5001
ENTRYPOINT ["dotnet", "RecipeHub.Identity.Api.dll"]
