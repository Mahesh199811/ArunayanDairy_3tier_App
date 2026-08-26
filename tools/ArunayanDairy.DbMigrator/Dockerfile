FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build

WORKDIR /src

COPY ["backend/ArunayanDairy.Api/ArunayanDairy.Api.csproj", "backend/ArunayanDairy.Api/"]
COPY ["tools/ArunayanDairy.DbMigrator/ArunayanDairy.DbMigrator.csproj", "tools/ArunayanDairy.DbMigrator/"]

RUN dotnet restore "tools/ArunayanDairy.DbMigrator/ArunayanDairy.DbMigrator.csproj"

COPY backend/ArunayanDairy.Api/ backend/ArunayanDairy.Api/
COPY tools/ArunayanDairy.DbMigrator/ tools/ArunayanDairy.DbMigrator/

RUN dotnet publish \
    "tools/ArunayanDairy.DbMigrator/ArunayanDairy.DbMigrator.csproj" \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final

WORKDIR /app

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "ArunayanDairy.DbMigrator.dll"]
