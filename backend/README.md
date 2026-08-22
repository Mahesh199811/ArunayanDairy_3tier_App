# ArunayanDairy API

The backend is an ASP.NET Core API targeting .NET 8 LTS.

## Run Locally

From the repository root:

```bash
dotnet restore ArunayanDairy.sln
dotnet run --project backend/ArunayanDairy.Api
```

The development profile listens on `http://localhost:5080`.

Available endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /` | API identity and runtime status |
| `GET /health` | Overall health response with check details |
| `GET /health/live` | Liveness probe for the container orchestrator |

Test the API:

```bash
curl http://localhost:5080/
curl http://localhost:5080/health
curl http://localhost:5080/health/live
```

## Production Configuration

Production settings are loaded from `appsettings.Production.json` when:

```text
ASPNETCORE_ENVIRONMENT=Production
```

The API listens on port `8080` in production and expects TLS to terminate at the Application Load Balancer. Forwarded headers restore the original client IP address and request scheme.

Configure the load balancer target group health check as:

```text
Protocol: HTTP
Port: traffic port
Path: /health
Success codes: 200
```

Do not store credentials in an appsettings file. Supply database credentials and other secrets through AWS Secrets Manager and environment variables.