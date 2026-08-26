# ArunayanDairy Interview Guide

Project-specific interview preparation for the ArunayanDairy AWS 3-tier application, covering the work completed from Phase 1 through Phase 3.

## Project At A Glance

ArunayanDairy is a production-style 3-tier application deployed in `ap-south-1`:

```text
Frontend: S3 + CloudFront + Route 53
Backend:  Route 53 + ALB + ACM + ECS Fargate + ECR
Database: Private RDS MySQL
Config:   Secrets Manager + SSM Parameter Store
Schema:   EF Core + one-off ECS migration task
```

The main request path is:

```text
Client
  |
  v
Route 53: api.arunayandairy.store
  |
  v
ALB HTTPS :443
  |
  v
Target Group HTTP :8080
  |
  v
ECS Fargate API task
  |
  v
Private RDS MySQL :3306
```

The frontend is separate:

```text
frontend.arunayandairy.store -> Route 53 -> CloudFront -> Private S3
```

## How To Answer Project Questions

Use this structure for almost every answer:

1. Explain what the service or concept is.
2. Explain why ArunayanDairy needed it.
3. Describe how it was configured.
4. Mention a real problem encountered when relevant.
5. Explain the fix and the validation performed.

This demonstrates implementation experience rather than memorized definitions.

## Priority Questions

Master these first:

1. Explain the complete ArunayanDairy architecture.
2. What is the difference between a public and private subnet?
3. What is the difference between an Internet Gateway and a NAT Gateway?
4. How did you design the security groups?
5. What are an ECS cluster, task, and service?
6. Why did you choose Fargate?
7. What is an ECS task definition?
8. How do the ALB and target group work together?
9. Explain the Route 53 to ALB to ECS request flow.
10. Why is RDS private?
11. Why use Secrets Manager and SSM Parameter Store separately?
12. Explain the `GetSecretValue` failure.
13. Explain the `linux/amd64` Docker failure.
14. Why use a separate EF Core migration task?
15. How do you troubleshoot an unhealthy ECS task?

# Phase 1: AWS Networking

## VPC And CIDR

### Why did you create a VPC?

I created a dedicated VPC to isolate ArunayanDairy resources and control traffic between the public entry point, private application tasks, and the database. The VPC was named `ArunayanDairy-Dev-VPC` and used CIDR `10.0.0.0/16`.

### What does `10.0.0.0/16` mean?

It defines the private IPv4 range from `10.0.0.0` through `10.0.255.255`, providing 65,536 addresses. The range was divided into smaller subnets for public, application, and database tiers.

### Why use multiple subnets and Availability Zones?

Subnets provide isolation by function, while multiple Availability Zones improve availability. The design used public subnets for the ALB and NAT Gateway, private application subnets for ECS, and private database subnets for RDS.

## Public And Private Subnets

A public subnet has a route to an Internet Gateway. A private subnet has no direct Internet Gateway route. Private application resources can use a NAT Gateway for outbound access without accepting direct inbound internet connections.

RDS belongs in private database subnets because it contains persistent data and does not need to be publicly reachable.

## Internet Gateway And NAT Gateway

An Internet Gateway provides internet connectivity for resources in public subnets. A NAT Gateway, deployed in a public subnet, allows private resources to initiate outbound connections through the Internet Gateway while preventing unsolicited inbound connections to those private resources.

To troubleshoot a private subnet without internet access, check the subnet association, route table, NAT Gateway state, Elastic IP, Internet Gateway, security-group egress, and network ACLs.

## Security Groups

Security groups are stateful virtual firewalls. ArunayanDairy uses layered access:

```text
Internet -> ALB security group :80/:443
ALB security group -> ECS security group :8080
ECS security group -> RDS security group :3306
```

The RDS security group allows MySQL traffic only from the ECS/API security group. It does not allow `0.0.0.0/0` on port `3306`, which prevents arbitrary internet hosts from attempting database connections.

## IAM

IAM answers three questions: who is making the request, which action is being requested, and which resource is being accessed. The ECS task execution role was used for infrastructure-level startup operations such as pulling from ECR, writing CloudWatch logs, retrieving Secrets Manager values, and reading SSM parameters.

An IAM user represents an identity, a role is an assumable identity used by AWS services or applications, and a policy defines permitted or denied actions.

# Phase 2: Frontend And DNS

## Why use S3 and CloudFront?

The frontend consists of static HTML, CSS, JavaScript, and assets. S3 provides durable object storage, while CloudFront provides public HTTPS delivery and caching. The S3 bucket remains private with Block Public Access enabled; CloudFront uses Origin Access Control to read objects.

S3 versioning was enabled so accidental overwrites or deletions can be recovered.

## Route 53 And ACM

The frontend uses `frontend.arunayandairy.store` and the backend uses `api.arunayandairy.store`. These are separate DNS paths. Route 53 maps the backend name to the ALB and the frontend name to CloudFront.

ACM manages the TLS certificate. The frontend certificate was created in `us-east-1` for CloudFront, while the backend certificate was used on the regional ALB in `ap-south-1`.

The ALB terminates HTTPS on port `443`. Its port `80` listener redirects HTTP requests to HTTPS.

# Phase 3: Backend Deployment

## Why Dockerize The API?

Docker packages the .NET application, runtime dependencies, and published output into a repeatable image. This makes the deployment independent of the host machine's installed runtime.

The API uses a multi-stage Dockerfile: the .NET 8 SDK image restores, builds, and publishes the application, and the .NET 8 ASP.NET runtime image runs the published output. The API listens on port `8080`.

## ECR, ECS, And Fargate

Amazon ECR stores the private API image. ECS orchestrates tasks and services, while Fargate runs the containers without requiring management of EC2 container hosts.

- **Cluster:** logical grouping, `ArunayanDairy-Dev-Cluster`.
- **Task:** running instance of a task definition.
- **Task definition:** immutable blueprint containing image, CPU, memory, ports, environment, secrets, roles, and logging.
- **Service:** maintains the desired number of tasks and performs deployments and replacements.

The API service runs in private application subnets with public IP assignment disabled. The ALB target group sends HTTP traffic to port `8080` and checks `/health`.

## Docker Architecture Failure

The development machine is Apple Silicon, so the first image was built for `linux/arm64`. ECS required `linux/amd64`, producing a `CannotPullContainerError` because the image manifest did not contain an AMD64 descriptor.

The fix was to build explicitly for the ECS platform:

```bash
docker buildx build \
  --platform linux/amd64 \
  -f backend/Dockerfile \
  -t arunayandairy-api:1.1-amd64 \
  --load \
  .
```

The image architecture must match the ECS task runtime platform.

## Database And Secrets

RDS MySQL is private and reachable only from the ECS security group on port `3306`. The application database is `ArunayanDairy`.

Sensitive and non-sensitive configuration are separated:

```text
Secrets Manager: DB_USER, DB_PASSWORD
SSM Parameter Store: DB_HOST
Normal environment variable: DB_PORT=3306, DB_NAME=ArunayanDairy
```

The RDS-managed secret contained username and password but not the database host. When ECS attempted to retrieve a `host` JSON key, the task failed. The fix was to provide the RDS endpoint separately through SSM.

## IAM Troubleshooting Stories

### Secrets Manager AccessDenied

The ECS task failed with `secretsmanager:GetSecretValue` access denied. I identified `ecsTaskExecutionRole` as the principal, verified that the action was missing, granted the least-privilege permission for the required secret, and redeployed.

### SSM AccessDenied

The task then failed with `ssm:GetParameters` access denied. I applied the same principal-action-resource analysis, added permission for the required parameter, and redeployed.

## Health Checks

The API exposes three useful endpoints:

- `/health`: overall health endpoint for the ALB.
- `/health/live`: confirms that the process is alive.
- `/health/ready`: checks configured dependencies, including MySQL.

`/health/ready` returning `Healthy` proved the complete application path from the ALB through ECS, EF Core, and private RDS.

# EF Core And Database Migration

## Why Use A Separate Migrator?

RDS is private, so the Mac should not connect directly to it. A dedicated `ArunayanDairy.DbMigrator` runs as a one-off ECS task inside the VPC.

The deployment flow is:

```text
Build image -> Push to ECR -> Run migration task -> Verify exit code 0 -> Deploy API
```

The migrator receives `DB_HOST`, `DB_PORT`, `DB_USER`, and `DB_PASSWORD`, applies `20260824191040_InitialCreate`, and creates the `ArunayanDairy` schema, including `Products` and `__EFMigrationsHistory`.

The migration task entering `STOPPED` is expected when its exit code is `0`; it is a completed one-time job, not a failed long-running service.

## Why Not Run Migrations On API Startup?

If several ECS tasks start at the same time, each task could attempt a migration. That can cause race conditions, startup delays, and deployment failures. A separate migration task makes schema changes explicit, observable, and independently verifiable.

## Migrator Packaging Failure

The first migration task printed `Hello, World!`. The ECS infrastructure was working, but the image contained the default console template rather than the migration implementation. I corrected `Program.cs`, added the API project and Pomelo EF Core references, rebuilt the image, and pushed a new tag.

The corrected image was published as:

```text
659093653742.dkr.ecr.ap-south-1.amazonaws.com/arunayandairy-api:db-migrator-1.1
```

The successful output was:

```text
Applying ArunayanDairy database migrations...
Database migration completed successfully.
```

# Scenario-Based Questions

## ECS Task Stops Unexpectedly

Check the stopped reason, container exit code, CloudWatch logs, task definition, environment variables and secrets, IAM execution role, ECR image, networking, security groups, and application health. Do not restart repeatedly without identifying the cause.

## ALB Target Is Unhealthy

Check the target group path and port, ECS container port, security-group rules, task status, application logs, listener binding, and whether `/health` returns HTTP `200`.

For ArunayanDairy the expected path is:

```text
ALB -> HTTP :8080 -> GET /health -> .NET API
```

## API Works Locally But Fails In ECS

Compare the environments: image architecture, image tag, port, environment variables, secret keys, database host, VPC, subnets, security groups, IAM permissions, and runtime configuration.

## ECS Cannot Pull An Existing ECR Image

Check the repository, tag, execution-role ECR permissions, network access to ECR, and image architecture. In this project, the root cause was ARM64 versus AMD64.

## RDS Connection Fails

Check `DB_HOST`, `DB_PORT`, credentials, RDS availability, DNS resolution, subnet routing, VPC placement, and whether the RDS security group allows port `3306` from the ECS security group.

## Sudden Traffic Increase

Monitor ALB request count and latency, ECS CPU and memory, task count, and RDS capacity. Configure ECS service auto scaling based on appropriate CPU, memory, or request metrics, and verify that the database can handle the increased connection and query load.

## Deploy A New API Version

Build and test a versioned image, push it to ECR, create a new ECS task-definition revision, update the service, and wait for new tasks to pass ALB health checks before old tasks are removed. Versioned tags improve auditing and rollback compared with `latest`.

## Roll Back A Deployment

Redeploy the previous known-good task-definition revision and let ECS replace the failed revision. For example, roll back from API revision `5` to revision `4`.

# Two-Minute Architecture Answer

> I built ArunayanDairy as a three-tier AWS application. In Phase 1, I created a VPC with public and private subnets across Availability Zones, Internet and NAT gateways, route tables, and security groups.
>
> In Phase 2, I deployed the static frontend using a private S3 bucket and CloudFront, with Route 53 and HTTPS. The frontend and backend use separate DNS names.
>
> In Phase 3, I containerized the .NET 8 API with Docker and pushed a Linux AMD64 image to Amazon ECR. I deployed it on ECS Fargate in private subnets behind an Application Load Balancer. Route 53 maps `api.arunayandairy.store` to the ALB, ACM provides TLS, and HTTP redirects to HTTPS.
>
> For persistence, I used a private RDS MySQL database. ECS reaches RDS through private networking and security-group rules on port `3306`. Database credentials are stored in Secrets Manager, while the RDS endpoint is supplied separately through SSM Parameter Store.
>
> I integrated EF Core and created a separate database migrator that runs as a one-off ECS task inside the VPC. It applies the initial migration without exposing RDS publicly. Finally, I verified `/health` and `/health/ready`, proving both API availability and database connectivity.

# Final Checklist

```text
[ ] Explain the complete Route 53 -> ALB -> ECS -> RDS flow
[ ] Explain public/private subnet routing
[ ] Explain the ALB, target group, and port 8080 configuration
[ ] Explain ECS cluster, task definition, task, and service
[ ] Explain Fargate and the private subnet choice
[ ] Explain Secrets Manager versus SSM
[ ] Explain the IAM AccessDenied troubleshooting method
[ ] Explain the ARM64/AMD64 image mismatch and buildx fix
[ ] Explain why RDS is private
[ ] Explain the separate EF Core migration task
[ ] Explain why a successful migration task becomes STOPPED
[ ] Explain how /health/ready validated ECS-to-RDS connectivity
[ ] Explain the next phase: Product CRUD, DTOs, validation, auth, and observability
```

Detailed deployment procedures are documented in [backend/README.md](backend/README.md), and the chronological incident notes are in [backend/PHASE-3-TROUBLESHOOTING.md](backend/PHASE-3-TROUBLESHOOTING.md).
