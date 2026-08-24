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
	-t arunayandairy-api:1.0-amd64 \
	--load \
	.
```

Tag the image with the ECR repository URI:

```bash
docker tag \
	arunayandairy-api:1.0-amd64 \
	659093653742.dkr.ecr.ap-south-1.amazonaws.com/arunayandairy-api:1.1
```

Push the image to ECR:

```bash
docker push \
	659093653742.dkr.ecr.ap-south-1.amazonaws.com/arunayandairy-api:1.1
```

Verify the uploaded image with the AWS CLI:

```bash
aws ecr describe-images \
	--repository-name arunayandairy-api \
	--image-ids imageTag=1.1 \
	--region ap-south-1
```

The verified `1.1` image is `linux/amd64`. Its local image ID and remote ECR digest match:

```text
sha256:7e55d861f9b69977b6cb8cc92fd084b9ae41ccb63f28026c17ab10a4439a23d5
```

Pull and run the ECR image when needed:

```bash
docker pull \
	659093653742.dkr.ecr.ap-south-1.amazonaws.com/arunayandairy-api:1.1

docker run -d \
	--name arunayandairy-api-ecr \
	-p 8080:8080 \
	659093653742.dkr.ecr.ap-south-1.amazonaws.com/arunayandairy-api:1.1
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
DB_NAME      mysql
```

The database registration is conditional so the API can still run locally
without RDS variables. In that case `/health/live` remains available, while
`/health/ready` has no configured dependency checks.

The RDS infrastructure and EF Core connection path are complete. Application
entities, tables, and EF Core migrations remain part of the next database
schema phase.