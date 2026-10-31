FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY Directory.Build.props ./
COPY BuildingBlocks/ ./BuildingBlocks/
COPY Contracts/ ./Contracts/
COPY Services/Quiz/ ./Services/Quiz/

RUN dotnet restore Services/Quiz/RecipeHub.Quiz.Api/RecipeHub.Quiz.Api.csproj
RUN dotnet publish Services/Quiz/RecipeHub.Quiz.Api/RecipeHub.Quiz.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:5005
EXPOSE 5005
ENTRYPOINT ["dotnet", "RecipeHub.Quiz.Api.dll"]
