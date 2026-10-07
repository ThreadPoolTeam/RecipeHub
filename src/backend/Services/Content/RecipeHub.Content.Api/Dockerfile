FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY Directory.Build.props ./
COPY BuildingBlocks/ ./BuildingBlocks/
COPY Contracts/ ./Contracts/
COPY Services/Content/ ./Services/Content/

RUN dotnet restore Services/Content/RecipeHub.Content.Api/RecipeHub.Content.Api.csproj
RUN dotnet publish Services/Content/RecipeHub.Content.Api/RecipeHub.Content.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:5003
EXPOSE 5003
ENTRYPOINT ["dotnet", "RecipeHub.Content.Api.dll"]
