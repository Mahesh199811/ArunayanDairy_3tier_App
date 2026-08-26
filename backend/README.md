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
| `GET /health/ready` | Readiness probe for configured dependencies, including MySQL |

Test the API:

```bash
curl http://localhost:5080/
curl http://localhost:5080/health
curl http://localhost:5080/health/live
curl http://localhost:5080/health/ready
```

## Run With Docker

Run all commands from the repository root.

Build the API image:

```bash
docker build -f backend/Dockerfile -t arunayandairy-api:local .
```

Start the container on port `8080`:

```bash
docker run -d \
	--name arunayandairy-api \
	-p 8080:8080 \
	arunayandairy-api:local
```

Verify the running container:

```bash
docker ps
docker logs arunayandairy-api
curl http://localhost:8080/health
```

Stop the container:

```bash
docker stop arunayandairy-api
```

Remove the stopped container:

```bash
docker rm arunayandairy-api
```

Stop and remove the container in one command:

```bash
docker rm -f arunayandairy-api
```

Remove the local image when it is no longer needed:

```bash
docker image rm arunayandairy-api:local
```

## Push The Image To Amazon ECR

The API image is stored in Amazon Elastic Container Registry (ECR).

```text
AWS account: 659093653742
AWS Region:  ap-south-1
Repository:  arunayandairy-api
Image tag:   2.0
```

Before running these commands, configure the AWS CLI with credentials that allow ECR authentication and image uploads.

Authenticate Docker with ECR:

```bash
aws ecr get-login-password --region ap-south-1 \
	| docker login \
			--username AWS \
			--password-stdin 659093653742.dkr.ecr.ap-south-1.amazonaws.com
```

Build the Linux AMD64 image from the repository root. This platform matches the ECS Fargate task runtime:

```bash
docker buildx build \
	--platform linux/amd64 \
	-f backend/Dockerfile \
	-t arunayandairy-api:2.0-amd64 \
	--load \
	.
```

Tag the image with the ECR repository URI:

```bash
docker tag \
	arunayandairy-api:2.0-amd64 \
	659093653742.dkr.ecr.ap-south-1.amazonaws.com/arunayandairy-api:2.0
```

Push the image to ECR:

```bash
docker push \
	659093653742.dkr.ecr.ap-south-1.amazonaws.com/arunayandairy-api:2.0
```

Verify the uploaded image with the AWS CLI:

```bash
aws ecr describe-images \
	--repository-name arunayandairy-api \
	--image-ids imageTag=2.0 \
	--region ap-south-1
```

The verified `2.0` image is `linux/amd64` and was successfully pushed to ECR.

```text
sha256:7e55d861f9b69977b6cb8cc92fd084b9ae41ccb63f28026c17ab10a4439a23d5
```

Pull and run the ECR image when needed:

```bash
docker pull \
	659093653742.dkr.ecr.ap-south-1.amazonaws.com/arunayandairy-api:2.0

docker run -d \
	--name arunayandairy-api-ecr \
	-p 8080:8080 \
	659093653742.dkr.ecr.ap-south-1.amazonaws.com/arunayandairy-api:2.0
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

## Database Configuration

When all database variables are present, the API registers
`ArunayanDairyDbContext` with Pomelo Entity Framework Core for MySQL and adds a
MySQL readiness check to `/health/ready`.

The ECS task supplies the following variables:

```text
DB_HOST      RDS endpoint supplied as a normal environment variable
DB_PORT      3306 supplied as a normal environment variable
DB_USER      username injected from the Secrets Manager JSON key `username`
DB_PASSWORD  password injected from the Secrets Manager JSON key `password`
DB_NAME      ArunayanDairy
```

The database registration is conditional so the API can still run locally
without RDS variables. In that case `/health/live` remains available, while
`/health/ready` has no configured dependency checks.

The API uses the `ArunayanDairy` application database. The database registration
is conditional so the API can still run locally without RDS variables. In that
case `/health/live` remains available, while `/health/ready` has no configured
database dependency checks.

## Phase 3 Deployment Record

The backend was deployed to AWS using the following request path:

```text
Route 53 -> ALB HTTPS 443 -> ECS Fargate -> API port 8080 -> RDS MySQL 3306
```

Completed AWS resources and configuration:

```text
ECS cluster:       ArunayanDairy-Dev-Cluster
ECS service:       ArunayanDairy-Dev-API-Service
ECR repository:    659093653742.dkr.ecr.ap-south-1.amazonaws.com/arunayandairy-api
API domain:        https://api.arunayandairy.store
Database:          Private RDS MySQL, ArunayanDairy
```

The ALB terminates HTTPS using ACM and redirects HTTP port `80` to HTTPS port
`443`. The target group forwards HTTP traffic to the ECS task on port `8080`
and checks `/health`. The ECS security group accepts port `8080` only from the
ALB security group, and the RDS security group accepts port `3306` only from
the ECS security group.

## Database Migrations

The API contains the `Product` entity and its `Products` DbSet. The initial
EF Core migration is:

```text
20260824191040_InitialCreate
```

For local development, start MySQL with the design-time credentials expected by
`ArunayanDairyDbContextFactory`:

```bash
docker run -d \
	--name arunayandairy-mysql \
	-e MYSQL_DATABASE=ArunayanDairy \
	-e MYSQL_USER=design \
	-e MYSQL_PASSWORD=design \
	-e MYSQL_ROOT_PASSWORD=root \
	-p 3306:3306 \
	mysql:8.0
```

Then apply migrations from the API project directory:

```bash
cd backend/ArunayanDairy.Api
dotnet ef database update
```

For the private RDS database, use the one-off `ArunayanDairy.DbMigrator`
container from inside the VPC. It requires `DB_HOST`, `DB_PORT`, `DB_USER`, and
`DB_PASSWORD` and exits after applying migrations. A successful stopped task is
expected for this workload.

Build the migrator image from the repository root:

```bash
docker buildx build \
	--platform linux/amd64 \
	-f tools/ArunayanDairy.DbMigrator/Dockerfile \
	-t arunayandairy-db-migrator:1.1 \
	--load \
	.
```

The image is published as:

```text
659093653742.dkr.ecr.ap-south-1.amazonaws.com/arunayandairy-api:db-migrator-1.1
```

To validate against a local MySQL container on Docker Desktop:

```bash
docker run --rm --platform linux/amd64 \
	-e DB_HOST=host.docker.internal \
	-e DB_PORT=3306 \
	-e DB_USER=design \
	-e DB_PASSWORD=design \
	arunayandairy-db-migrator:1.1
```

Expected output:

```text
Applying ArunayanDairy database migrations...
Database migration completed successfully.
```

The migration creates the `ArunayanDairy` database schema, including
`Products` and `__EFMigrationsHistory`.

## Phase 3 Troubleshooting Summary

| Symptom | Root cause | Resolution |
|---|---|---|
| ECS could not pull the image | ARM64 image on an AMD64 task | Build with `--platform linux/amd64` |
| Secrets Manager `AccessDeniedException` | Missing `secretsmanager:GetSecretValue` | Grant the action to the ECS execution role |
| Secret did not contain `host` | RDS secret contained credentials only | Supply `DB_HOST` separately through SSM |
| SSM `AccessDeniedException` | Missing `ssm:GetParameters` | Grant the action to the ECS execution role |
| Migrator printed `Hello, World!` | Default console image was deployed | Rebuild the image after adding migration code |
| Migration task stopped | One-off task completed | Verify logs and exit code `0` |

Detailed investigation notes are in [PHASE-3-TROUBLESHOOTING.md](PHASE-3-TROUBLESHOOTING.md).