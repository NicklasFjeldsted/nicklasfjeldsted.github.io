# Bygger og kører API'et. Det samme image virker på ARM (Hetzner CAX) og x86.
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Kopiér kun projektfilerne først, så pakker kan caches mellem builds.
COPY src/Mvo.Api/Mvo.Api.csproj src/Mvo.Api/
COPY src/Mvo.Application/Mvo.Application.csproj src/Mvo.Application/
COPY src/Mvo.Infrastructure/Mvo.Infrastructure.csproj src/Mvo.Infrastructure/
RUN dotnet restore src/Mvo.Api/Mvo.Api.csproj

COPY src/ src/
RUN dotnet publish src/Mvo.Api/Mvo.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080
ENTRYPOINT ["dotnet", "Mvo.Api.dll"]
