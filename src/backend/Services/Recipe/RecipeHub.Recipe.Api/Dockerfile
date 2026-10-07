FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY Directory.Build.props ./
COPY BuildingBlocks/ ./BuildingBlocks/
COPY Contracts/ ./Contracts/
COPY Services/Recipe/ ./Services/Recipe/

RUN dotnet restore Services/Recipe/RecipeHub.Recipe.Api/RecipeHub.Recipe.Api.csproj
RUN dotnet publish Services/Recipe/RecipeHub.Recipe.Api/RecipeHub.Recipe.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:5002
EXPOSE 5002
ENTRYPOINT ["dotnet", "RecipeHub.Recipe.Api.dll"]
