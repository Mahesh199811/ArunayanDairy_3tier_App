# ArunayanDairy Phase 3 Troubleshooting History

This document records the issues encountered while moving the ArunayanDairy .NET API from local development to a production-style AWS ECS Fargate deployment. It captures symptoms, root causes, fixes, verification steps, and lessons learned.

## Troubleshooting Timeline

```text
Local .NET API
      |
Local Docker container
      |
Amazon ECR
      |
ECS Fargate
      |
Application Load Balancer
      |
Route 53 and HTTPS
```

## 1. Local .NET API

### Context

The backend was created with:

```text
ASP.NET Core Minimal API
.NET 8 LTS
```

It was started locally from the repository root:

```bash
dotnet run --project backend/ArunayanDairy.Api
```

Development address:

```text
http://localhost:5080
```

Validated endpoints:

```text
GET /
GET /health
GET /health/live
```

### Result

All endpoints returned HTTP `200`. No application-level issue was found at this stage.

## 2. Local Docker Container

### Context

The API uses a multi-stage Dockerfile with:

```text
Build stage:   mcr.microsoft.com/dotnet/sdk:8.0
Runtime stage: mcr.microsoft.com/dotnet/aspnet:8.0
Container port: 8080
```

The image was built and run locally:

```bash
docker build \
  -f backend/Dockerfile \
  -t arunayandairy-api:local \
  .

docker run -d \
  --name arunayandairy-api \
  -p 8080:8080 \
  arunayandairy-api:local
```

Validation:

```bash
curl http://localhost:8080/
curl http://localhost:8080/health
```

Example root response:

```json
{
  "service": "ArunayanDairy API",
  "environment": "Production",
  "status": "running"
}
```

Container startup information:

```text
Listening address:    http://[::]:8080
Hosting environment: Production
Health result:        Healthy
```

### Result

The image and API worked correctly in the local Docker environment.

## 3. ECS Could Not Pull The Image

### Symptom

The first image was pushed to ECR as:

```text
arunayandairy-api:1.0
```

The image appeared in ECR, but the ECS Fargate task stopped during startup.

ECS reported:

```text
CannotPullContainerError

pull image manifest has been retried 7 time(s):
image manifest does not contain descriptor matching platform 'linux/amd64'
```

### Root Cause

The development machine was an Apple Silicon Mac, so the original Docker image was built for `linux/arm64`. The ECS task definition expected `linux/amd64`.

```text
Apple Silicon Mac
       |
linux/arm64 image
       |
Amazon ECR
       |
ECS task expects linux/amd64
       |
CannotPullContainerError
```

ECS could find the repository and tag, but the image manifest had no compatible AMD64 image.

This was not an:

- ECR authentication failure
- IAM permission failure
- VPC or subnet failure
- Repository naming problem
- Missing image tag

The image existed, but its CPU architecture did not match the ECS runtime platform.

## 4. Architecture Fix With Docker Buildx

### Fix

The image was rebuilt explicitly for Linux AMD64. Because the Dockerfile is under `backend/`, the `-f` argument is required when building from the repository root.

```bash
docker buildx build \
  --platform linux/amd64 \
  -f backend/Dockerfile \
  -t arunayandairy-api:1.0-amd64 \
  --load \
  .
```

The architecture was verified locally:

```bash
docker image inspect arunayandairy-api:1.0-amd64 \
  --format 'OS={{.Os}} Architecture={{.Architecture}}'
```

Expected result:

```text
OS=linux Architecture=amd64
```

The image was tagged as release `1.1` and pushed to ECR:

```bash
docker tag \
  arunayandairy-api:1.0-amd64 \
  659093653742.dkr.ecr.ap-south-1.amazonaws.com/arunayandairy-api:1.1

docker push \
  659093653742.dkr.ecr.ap-south-1.amazonaws.com/arunayandairy-api:1.1
```

Verified ECR image:

```text
Repository:   arunayandairy-api
Tag:          1.1
Platform:     linux/amd64
Image digest: sha256:7e55d861f9b69977b6cb8cc92fd084b9ae41ccb63f28026c17ab10a4439a23d5
```

### Result

The corrected image was compatible with the ECS Fargate task runtime.

## 5. ECS Task Definition Revision

### Symptom

The original task definition still referenced the incompatible image:

```text
arunayandairy-api:1.0
```

### Fix

A new task definition revision was created:

```text
ArunayanDairy-Dev-API:2
```

The container image was changed to:

```text
659093653742.dkr.ecr.ap-south-1.amazonaws.com/arunayandairy-api:1.1
```

The ECS service was updated to use revision `:2`.

### Result

ECS pulled the AMD64 image and started the task successfully:

```text
Running tasks: 1
Pending tasks: 0
```

## 6. ECS Health Status Was Unknown

### Symptom

After the task started, ECS displayed:

```text
Health status: Unknown
```

### Root Cause

The container process was running, but no load balancer target-group health check was associated with the ECS service yet. A running task and a healthy load balancer target are related but separate states.

### Fix

An ALB target group was configured with:

```text
Protocol:          HTTP
Port:              8080
Target type:       IP
Health check path: /health
Success code:      200
```

Observed health-check flow:

```text
Application Load Balancer
        |
ECS task private IP:8080
        |
GET /health
        |
200 OK
        |
Healthy
```

### Result

The target changed to `Healthy` after the ECS service was associated with the target group.

## 7. ECS Task Was Not Publicly Reachable

### Symptom

The API process was running, but its task IP and port could not be opened directly from the internet.

### Root Cause

The ECS task was intentionally configured with:

```text
Subnet:    Private application subnet
Public IP: Disabled
```

The desired production architecture does not expose ECS tasks directly.

```text
Internet --X--> Private ECS Task
```

### Resolution

An internet-facing Application Load Balancer was placed in public subnets and allowed to forward traffic to the ECS task in private subnets.

```text
Internet
    |
Public Application Load Balancer
    |
Private ECS Fargate Task
```

### Lesson

A private task being inaccessible directly is expected and confirms that the network boundary is working as designed.

## 8. ALB Target Registration

### Context

The ECS service was associated with the Application Load Balancer and target group:

```text
ECS Service
    |
Application Load Balancer
    |
IP Target Group
    |
Container port 8080
```

ECS automatically registered the task's private IP on port `8080`. One observed task address was `10.0.12.72`; task IP addresses can change when ECS replaces or redeploys tasks.

### Result

```text
Total targets:   1
Healthy targets: 1
Unhealthy:       0
```

No manual target registration is required when the load balancer is integrated with the ECS service.

## 9. ALB Initially Displayed Not Secure

### Symptom

The API responded through the ALB-generated DNS name:

```text
http://arunayandairy-dev-alb-612571505.ap-south-1.elb.amazonaws.com
```

The browser displayed `Not Secure`.

### Root Cause

The load balancer only had an HTTP listener on port `80`. TLS termination and an HTTPS listener had not been configured yet.

### Result

This behavior was expected until an ACM certificate and HTTPS listener were added.

## 10. ACM Certificate Region

### Requirement

The API was assigned the custom domain:

```text
api.arunayandairy.store
```

An ACM certificate was requested and validated through DNS.

### Important Region Distinction

```text
CloudFront certificate: us-east-1
ALB certificate:        Same region as the ALB, ap-south-1
```

CloudFront is a global service and requires its ACM certificate in `us-east-1`. An Application Load Balancer is regional and requires its certificate in the ALB's region.

### Result

The certificate for `api.arunayandairy.store` was issued in `ap-south-1` and made available to the ALB HTTPS listener.

## 11. HTTPS Listener And Custom Domain

### Fix

An HTTPS listener was added to the Application Load Balancer:

```text
Listener:    HTTPS 443
Certificate: api.arunayandairy.store
Forward to:  ECS API target group
```

A Route 53 alias record was created:

```text
Record: api.arunayandairy.store
Type:   A (Alias)
Target: ArunayanDairy-Dev-ALB
```

Final request flow:

```text
api.arunayandairy.store
        |
Route 53
        |
Application Load Balancer HTTPS:443
        |
ECS Target Group HTTP:8080
        |
ArunayanDairy.Api
```

## 12. HTTPS API Validation

The public health endpoint was tested:

```text
https://api.arunayandairy.store/health
```

Response:

```json
{
  "status": "Healthy",
  "checks": [
    {
      "name": "self",
      "status": "Healthy"
    }
  ]
}
```

This validated Route 53, the ACM certificate, the ALB HTTPS listener, target-group routing, the ECS task, and the API health endpoint.

## 13. HTTP To HTTPS Redirect

The ALB HTTP listener was changed from forwarding traffic to redirecting it:

```text
HTTP :80
    |
Redirect to HTTPS
    |
HTTPS :443
    |
Application Load Balancer
    |
Target Group
    |
ECS Fargate API :8080
```

Final behavior:

```text
http://api.arunayandairy.store
              |
              v
https://api.arunayandairy.store
```

## Issue Summary

| Issue | Root Cause | Resolution | Result |
|---|---|---|---|
| ECS task could not start | ARM64 image did not match AMD64 ECS runtime | Built with `docker buildx --platform linux/amd64` | Fixed |
| ECS could not pull image `1.0` | Image tag pointed to incompatible architecture | Built and pushed release `1.1` | Fixed |
| ECS task health was `Unknown` | No ALB target-group health check was associated | Configured `/health` on port `8080` | Healthy |
| ECS task was not publicly reachable | Task intentionally ran in a private subnet | Added a public ALB | Correct architecture |
| ALB target needed registration | ECS service was not yet associated with the target group | Added load balancer integration to the ECS service | Target registered automatically |
| ALB displayed `Not Secure` | Only an HTTP listener existed | Added ACM certificate and HTTPS listener | HTTPS enabled |
| Custom API domain was unavailable | Only the generated ALB hostname existed | Added Route 53 alias record | Custom domain active |
| ALB required a TLS certificate | No regional certificate was attached | Issued ACM certificate in `ap-south-1` | Certificate issued |
| HTTP remained available | Port `80` listener forwarded traffic | Changed listener to HTTPS redirect | Secure redirect enabled |

## Key DevOps Lesson

The most important troubleshooting experience was diagnosing the container architecture mismatch:

```text
Apple Silicon developer machine
        |
Default ARM64 Docker image
        |
Amazon ECR
        |
AMD64 ECS Fargate task
        |
CannotPullContainerError
        |
Inspect image manifest and runtime platform
        |
docker buildx --platform linux/amd64
        |
ECR image 1.1
        |
ECS task revision 2
        |
Running Fargate service
```

The repository, IAM permissions, network, and image tag can all be valid while deployment still fails because the image manifest does not contain the CPU architecture requested by the runtime. Platform compatibility should be verified explicitly when images are built on Apple Silicon for AMD64 cloud workloads.

## Operational Checks

Useful checks for future deployments:

```bash
# Verify local image architecture
docker image inspect arunayandairy-api:1.0-amd64 \
  --format 'OS={{.Os}} Architecture={{.Architecture}}'

# Verify the ECR image
aws ecr describe-images \
  --repository-name arunayandairy-api \
  --image-ids imageTag=1.1 \
  --region ap-south-1

# Verify the public API health endpoint
curl -i https://api.arunayandairy.store/health

# Verify HTTP redirects to HTTPS
curl -I http://api.arunayandairy.store
```