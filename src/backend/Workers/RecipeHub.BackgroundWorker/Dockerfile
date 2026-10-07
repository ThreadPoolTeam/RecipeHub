FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY Directory.Build.props ./
COPY BuildingBlocks/ ./BuildingBlocks/
COPY Contracts/ ./Contracts/
COPY Workers/ ./Workers/

RUN dotnet restore Workers/RecipeHub.BackgroundWorker/RecipeHub.BackgroundWorker.csproj
RUN dotnet publish Workers/RecipeHub.BackgroundWorker/RecipeHub.BackgroundWorker.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/runtime:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "RecipeHub.BackgroundWorker.dll"]
