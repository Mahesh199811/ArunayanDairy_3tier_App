FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

WORKDIR /src

COPY ["backend/ArunayanDairy.Api/ArunayanDairy.Api.csproj", "backend/ArunayanDairy.Api/"]

RUN dotnet restore "backend/ArunayanDairy.Api/ArunayanDairy.Api.csproj"

COPY ["backend/ArunayanDairy.Api/", "backend/ArunayanDairy.Api/"]

RUN dotnet publish "backend/ArunayanDairy.Api/ArunayanDairy.Api.csproj" \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final

WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_EnableDiagnostics=0 \
    ASPNETCORE_HTTP_PORTS= \
    ASPNETCORE_URLS=http://+:8080

EXPOSE 8080

ENTRYPOINT ["dotnet", "ArunayanDairy.Api.dll"]