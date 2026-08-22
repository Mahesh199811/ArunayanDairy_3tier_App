# ArunayanDairy - Phase 1 Network Foundation

## Project Overview

ArunayanDairy is planned as a production-grade 3-tier AWS application using AWS-native services only.

The 3 tiers are:

```text
Frontend Tier  -> S3, CloudFront, Route53
Backend Tier   -> Load Balancer, Auto Scaling, EC2, EBS, EFS, Lambda
Database Tier  -> RDS
```

## Project Details Before Phase 1

Before starting Phase 1, the project scope was defined as a complete AWS-native 3-tier application.

The goal is to build an application where:

```text
Users access the frontend through a domain name.
Frontend files are hosted in S3 and delivered through CloudFront.
Backend APIs run on EC2 instances behind an Application Load Balancer.
Backend EC2 instances scale automatically using Auto Scaling.
The database runs on private RDS subnets.
Shared backend files can be stored on EFS.
EC2 instances use EBS for root and application volumes.
Lambda can be used later for background tasks or event-driven jobs.
CloudWatch will be used for AWS-native logs, metrics, and alarms.
IAM will control permissions between AWS services.
```

No Terraform, Docker, Jenkins, Kubernetes, or third-party monitoring tools will be used for this project.

The project will be built manually using AWS Console and AWS-native services.

## AWS Services Planned For The Full Project

The full ArunayanDairy project will use the following AWS services:

| AWS Service | Planned Usage |
|---|---|
| VPC | Main private AWS network |
| CIDR | IP address planning for VPC and subnets |
| Subnet | Separate public, backend, and database tiers |
| Route Table | Control traffic routing between internet, NAT, and private tiers |
| Internet Gateway | Internet access for public subnets |
| NAT Gateway | Outbound internet access for private backend subnets |
| Security Group | Firewall rules between tiers |
| Network Interface | Virtual network cards used by AWS resources |
| EC2 | Backend application servers |
| EBS | EC2 root and data volumes |
| EFS | Shared file storage for backend EC2 instances |
| Auto Scaling | Automatically increase or decrease backend EC2 capacity |
| Load Balancer | Public entry point for backend traffic |
| IAM | Roles and permissions for AWS services |
| S3 | Frontend hosting, static assets, and possible backups |
| CloudWatch | Logs, metrics, alarms, and monitoring |
| RDS | Managed relational database |
| Route53 | DNS and domain records |
| CloudFront | CDN for frontend delivery |
| Lambda | Background processing and event-driven jobs |

## Planned Build Phases

The project will be built in phases:

```text
Phase 1: Network foundation
Phase 2: Frontend tier with S3, CloudFront, and Route53
Phase 3: Backend tier with Load Balancer, EC2, EBS, and Auto Scaling
Phase 4: Database tier with RDS
Phase 5: Shared storage with EFS
Phase 6: IAM roles and permissions
Phase 7: CloudWatch logs, metrics, and alarms
Phase 8: Lambda functions for background or event-driven tasks
Phase 9: Final production review and hardening
```

## Pre-Phase 1 Design Decisions

The following decisions were made before starting Phase 1:

```text
Project name: ArunayanDairy
Environment: Dev
Region: Asia Pacific (Mumbai), ap-south-1
Architecture: 3-tier application
Frontend tier: S3, CloudFront, Route53
Backend tier: Load Balancer, Auto Scaling, EC2, EBS, EFS, Lambda
Database tier: RDS
Monitoring: CloudWatch only
Deployment approach: Manual AWS Console setup
Infrastructure tooling: No Terraform
Container tooling: No Docker or Kubernetes
CI/CD tooling: No Jenkins
```

Phase 1 focuses only on the network foundation. This foundation is required before creating the frontend, backend, database, storage, monitoring, and DNS layers.

## Project Naming Convention

Use this naming format for AWS resources:

```text
ArunayanDairy-Dev-ResourceName
```

Examples:

```text
ArunayanDairy-Dev-VPC
ArunayanDairy-Dev-IGW
ArunayanDairy-Dev-NAT-A
ArunayanDairy-Dev-Public-RT
ArunayanDairy-Dev-ALB-SG
```

Recommended tags for every AWS resource:

```text
Project     = ArunayanDairy
Environment = Dev
ManagedBy   = Manual
Owner       = ArunayanDairy
```

## AWS Region

The project is being built in:

```text
Region: Asia Pacific (Mumbai)
Region code: ap-south-1
```

The network is designed across two Availability Zones for better availability.

## Phase 1 Services Used

### VPC

A VPC is the private network for the project inside AWS.

All major services such as EC2, Load Balancer, RDS, EFS, Lambda network interfaces, NAT Gateway, and security groups are connected through this VPC.

Created resource:

```text
Name: ArunayanDairy-Dev-VPC
CIDR: 10.0.0.0/16
State: Available
```

### CIDR

CIDR defines the private IP address range for the VPC and subnets.

The selected VPC CIDR is:

```text
10.0.0.0/16
```

This provides enough private IP address space for frontend networking, backend servers, database subnets, storage services, and future expansion.

### Subnets

Subnets divide the VPC network into smaller sections.

For this project, subnets are separated by purpose:

```text
Public subnets       -> Load Balancer and NAT Gateway
Private app subnets  -> Backend EC2 application servers
Private DB subnets   -> RDS database
```

Created subnets:

| Subnet Name | Purpose |
|---|---|
| Public Subnet A | Public tier resources in Availability Zone A |
| Public Subnet B | Public tier resources in Availability Zone B |
| Private App Subnet A | Backend application resources in Availability Zone A |
| Private App Subnet B | Backend application resources in Availability Zone B |
| Private DB Subnet A | Database resources in Availability Zone A |
| Private DB Subnet B | Database resources in Availability Zone B |

Public subnets should have auto-assign public IPv4 enabled.

Private app and private DB subnets should not auto-assign public IPv4 addresses.

### Internet Gateway

An Internet Gateway allows public resources in the VPC to communicate with the internet.

Created resource:

```text
Name: ArunayanDairy-Dev-IGW
State: Attached
Attached VPC: ArunayanDairy-Dev-VPC
```

The Internet Gateway should only be used by the public route table.

### NAT Gateway

A NAT Gateway allows private backend resources to access the internet without being directly exposed to the internet.

Typical uses:

```text
Install operating system updates
Download application packages
Reach AWS public endpoints
Allow private backend servers to make outbound calls
```

Production-grade design uses one NAT Gateway per Availability Zone:

```text
Private App Subnet A -> NAT Gateway A
Private App Subnet B -> NAT Gateway B
```

This improves availability and avoids cross-AZ dependency.

Current NAT Gateway state:

```text
At least one ArunayanDairy NAT Gateway is available
An old deleted NAT Gateway named ThreadHaus-nat-a may still appear temporarily in AWS
```

### Route Tables

Route tables control how subnet traffic is routed.

The project uses separate route tables for public, private app, and private database subnets.

#### Public Route Table

Purpose:

```text
Allows public subnets to reach the internet through the Internet Gateway.
```

Expected configuration:

```text
Name: ArunayanDairy-Dev-Public-RT

Routes:
10.0.0.0/16 -> local
0.0.0.0/0  -> ArunayanDairy-Dev-IGW

Subnet associations:
Public Subnet A
Public Subnet B
```

#### Private App Route Table A

Purpose:

```text
Allows backend resources in Private App Subnet A to reach the internet through NAT Gateway A.
```

Expected configuration:

```text
Name: ArunayanDairy-Dev-Private-App-RT-A

Routes:
10.0.0.0/16 -> local
0.0.0.0/0  -> ArunayanDairy-Dev-NAT-A

Subnet association:
Private App Subnet A
```

#### Private App Route Table B

Purpose:

```text
Allows backend resources in Private App Subnet B to reach the internet through NAT Gateway B.
```

Expected configuration:

```text
Name: ArunayanDairy-Dev-Private-App-RT-B

Routes:
10.0.0.0/16 -> local
0.0.0.0/0  -> ArunayanDairy-Dev-NAT-B

Subnet association:
Private App Subnet B
```

#### Private Database Route Table

Purpose:

```text
Keeps database subnets private and isolated from direct internet access.
```

Expected configuration:

```text
Name: ArunayanDairy-Dev-Private-DB-RT

Routes:
10.0.0.0/16 -> local

Subnet associations:
Private DB Subnet A
Private DB Subnet B
```

No `0.0.0.0/0` internet route should be added to the database route table.

### Security Groups

Security groups act as virtual firewalls for AWS resources.

The security groups are designed so traffic flows only through the correct application tiers.

#### Load Balancer Security Group

```text
Name: ArunayanDairy-Dev-ALB-SG
Purpose: Allows internet users to reach the public Application Load Balancer.
```

Inbound rules:

```text
HTTP  80  from 0.0.0.0/0
HTTPS 443 from 0.0.0.0/0
```

Outbound rules:

```text
All traffic allowed
```

#### Backend Application Security Group

```text
Name: ArunayanDairy-Dev-App-SG
Purpose: Allows traffic to backend EC2 application servers only from the Load Balancer.
```

Inbound rules:

```text
Custom TCP 8080 from ArunayanDairy-Dev-ALB-SG
```

Outbound rules:

```text
All traffic allowed
```

This means backend EC2 instances are not directly open to the internet.

#### Database Security Group

```text
Name: ArunayanDairy-Dev-RDS-SG
Purpose: Allows database access only from backend application servers.
```

Inbound rule for MySQL:

```text
MySQL/Aurora 3306 from ArunayanDairy-Dev-App-SG
```

Or inbound rule for PostgreSQL:

```text
PostgreSQL 5432 from ArunayanDairy-Dev-App-SG
```

Only one database engine port should be used based on the final RDS choice.

Outbound rules:

```text
All traffic allowed
```

#### EFS Security Group

```text
Name: ArunayanDairy-Dev-EFS-SG
Purpose: Allows backend EC2 servers to mount shared EFS storage.
```

Inbound rules:

```text
NFS 2049 from ArunayanDairy-Dev-App-SG
```

Outbound rules:

```text
All traffic allowed
```

#### Lambda Security Group

```text
Name: ArunayanDairy-Dev-Lambda-SG
Purpose: Used by Lambda functions that need VPC access.
```

Inbound rules:

```text
No inbound rules
```

Outbound rules:

```text
All traffic allowed
```

If Lambda needs to access RDS later, the RDS security group should allow the Lambda security group on the database port.

### Network Interfaces

A network interface is a virtual network card inside AWS.

In this project, network interfaces are usually created automatically by AWS services.

Examples:

```text
EC2 instances create network interfaces
Application Load Balancer creates network interfaces
NAT Gateway creates a network interface
RDS creates network interfaces
EFS mount targets create network interfaces
Lambda creates network interfaces when attached to the VPC
```

Network interfaces depend on the correct subnet and security group design.

## Phase 1 Final Architecture

```text
ArunayanDairy-Dev-VPC
CIDR: 10.0.0.0/16

Public Tier:
  Public Subnet A
  Public Subnet B
  Internet Gateway
  NAT Gateway A
  NAT Gateway B
  Public Route Table

Private Backend Tier:
  Private App Subnet A
  Private App Subnet B
  Private App Route Table A
  Private App Route Table B
  App Security Group on port 8080 from ALB only

Private Database Tier:
  Private DB Subnet A
  Private DB Subnet B
  Private DB Route Table with local route only
  RDS Security Group allowing database traffic only from App Security Group
```

## Phase 1 Completion Checklist

```text
[x] Created ArunayanDairy-Dev-VPC
[x] Created CIDR plan
[x] Created six subnets
[x] Created and attached Internet Gateway
[x] Created NAT Gateway for private outbound traffic
[x] Created route tables
[x] Associated public subnets with public route table
[x] Associated private app subnets with private app route tables
[x] Associated private DB subnets with private DB route table
[x] Created Load Balancer security group
[x] Created Backend App security group
[x] Configured backend app access on port 8080
[x] Created RDS security group
[x] Created EFS security group
[x] Created Lambda security group
```

## Important Security Notes

Backend EC2 instances should not be placed in public subnets.

RDS should only be placed in private DB subnets.

RDS should not have public accessibility enabled.

Database route tables should not have a route to the Internet Gateway or NAT Gateway.

Only the Load Balancer security group should accept internet traffic.

Only the backend app security group should accept app traffic from the Load Balancer security group.

Only the database security group should accept DB traffic from the backend app security group.

## Phase 2: Frontend Tier Implementation

### Objective

Deploy the ArunayanDairy frontend using a secure AWS static-hosting architecture.

```text
User
  |
CloudFront
  |
Private S3 Bucket
  |
Frontend Files
```

### Frontend Application

The ArunayanDairy operations frontend was created using:

```text
HTML
CSS
JavaScript
```

The application includes:

- Dairy operations overview
- Milk collection management
- Farmer directory
- Inventory tracking
- Farmer payment tracking
- Responsive desktop and mobile layouts
- Browser-based local data persistence

The deployment files are stored at the repository root:

```text
index.html
styles.css
app.js
```

### Amazon S3 Frontend Bucket

Created bucket:

```text
arunayandairy-dev-frontend
```

Configuration:

```text
Region:              ap-south-1 (Mumbai)
Object ownership:    Bucket owner enforced
ACLs:                Disabled
Block public access: Enabled
Versioning:          Enabled
Encryption:          Enabled
```

The frontend files were uploaded directly to the bucket root. The bucket remains private and is not exposed as an S3 static website.

### Amazon CloudFront Distribution

CloudFront was configured as the public entry point for the frontend.

```text
Origin:              Private S3 bucket REST endpoint
Origin access:       Origin Access Control (OAC)
Signing behavior:    Sign requests using SigV4
Cache policy:        CachingOptimized
Viewer protocol:     Redirect HTTP to HTTPS
Allowed methods:     GET and HEAD
Default root object: index.html
```

The S3 bucket policy grants `s3:GetObject` only to the CloudFront distribution. Direct access to S3 objects remains blocked.

### CloudFront Validation

The frontend was successfully tested through the CloudFront distribution:

```text
https://dxxpkgud2lap0.cloudfront.net/
```

The following checks were completed:

- CloudFront returns `index.html` for the distribution root
- HTML, CSS, and JavaScript assets load successfully
- HTTP requests redirect to HTTPS
- Direct public S3 access remains blocked
- Desktop and mobile layouts render correctly

When frontend files are updated in S3, the CloudFront cache is refreshed with an invalidation:

```text
/*
```

### Phase 2 Completion Checklist

```text
[x] Created the ArunayanDairy frontend application
[x] Created the private S3 frontend bucket
[x] Enabled S3 versioning and encryption
[x] Kept S3 Block Public Access enabled
[x] Uploaded frontend files to the bucket root
[x] Created the CloudFront distribution
[x] Configured Origin Access Control
[x] Applied the CloudFront S3 bucket policy
[x] Configured HTTPS redirection
[x] Set index.html as the default root object
[x] Validated the CloudFront frontend URL
```

## Phase 2.5: Custom Domain and SSL

### Objective

Connect the frontend to a custom domain and enable HTTPS with an AWS-managed certificate.

Target endpoint:

```text
https://frontend.arunayandairy.store
```

### Route 53 Configuration

```text
Domain:       arunayandairy.store
Registrar:    GoDaddy
DNS provider: Amazon Route 53
```

The GoDaddy nameservers were changed to the Route 53 hosted-zone nameservers, making Route 53 the authoritative DNS provider.

### ACM Certificate

The SSL certificate was created in the AWS region required by CloudFront:

```text
Region: us-east-1 (N. Virginia)
```

Certificate domains:

```text
arunayandairy.store
frontend.arunayandairy.store
```

Certificate configuration:

```text
Validation method: DNS validation
Status:            Issued
```

### CloudFront Custom Domain

The alternate domain name was added to the CloudFront distribution:

```text
frontend.arunayandairy.store
```

The issued ACM certificate was attached to the distribution.

### Route 53 Alias Record

Created record:

```text
Record type: A
Record name: frontend
Alias:       Yes
Target:      CloudFront distribution
```

Final request flow:

```text
frontend.arunayandairy.store
          |
      Route 53
          |
      CloudFront
          |
  Private S3 Bucket
```

### Phase 2.5 Completion Checklist

```text
[x] Created the Route 53 hosted zone
[x] Updated the domain nameservers at GoDaddy
[x] Requested the ACM certificate in us-east-1
[x] Completed DNS certificate validation
[x] Added the CloudFront alternate domain name
[x] Attached the ACM certificate to CloudFront
[x] Created the Route 53 alias record
```

## Phase 3: Backend API Implementation

### Goal

Deploy the ArunayanDairy .NET 8 Web API to AWS using a production-style container architecture.

Target request flow:

```text
Developer
  |
.NET 8 Web API
  |
Docker Image
  |
Amazon ECR
  |
Amazon ECS Fargate
  |
Application Load Balancer
  |
api.arunayandairy.store
```

The API, container image, ECR repository, ECS cluster, task definition, and Fargate service are complete. The load balancer and public API domain are the next implementation steps.

### Phase 3.1: Backend API Preparation

#### Application

Backend project:

```text
ArunayanDairy.Api
```

Technology:

```text
ASP.NET Core Minimal API
.NET 8 LTS
```

Project structure:

```text
ArunayanDairy_3tier_app/
|-- ArunayanDairy.sln
`-- backend/
  |-- Dockerfile
  |-- README.md
  `-- ArunayanDairy.Api/
    |-- ArunayanDairy.Api.csproj
    |-- Program.cs
    |-- appsettings.json
    |-- appsettings.Development.json
    |-- appsettings.Production.json
    `-- Properties/
      `-- launchSettings.json
```

#### Local API Validation

The API was started locally with:

```bash
dotnet run --project backend/ArunayanDairy.Api
```

Development address:

```text
http://localhost:5080
```

Validated endpoints:

| Endpoint | Purpose | Result |
|---|---|---|
| `GET /` | API identity and runtime status | `200 OK` |
| `GET /health` | Overall health and load balancer health checks | `200 Healthy` |
| `GET /health/live` | Container liveness checks | `200 Healthy` |

Example root response:

```json
{
  "service": "ArunayanDairy API",
  "environment": "Development",
  "status": "running"
}
```

The Release configuration was also compiled successfully:

```bash
dotnet build ArunayanDairy.sln --configuration Release
```

### Phase 3.2: Dockerization

#### Multi-Stage Docker Image

The API uses a multi-stage Docker build:

```text
Stage 1: .NET SDK 8.0
     Restore, build, and publish the API
             |
Stage 2: ASP.NET Runtime 8.0
     Copy and run only the published output
```

The production container configuration includes:

```text
Environment: Production
Port:        8080
Entry point: dotnet ArunayanDairy.Api.dll
```

The Docker build context excludes Git data, local build output, frontend assets, logs, and local secret files through `.dockerignore`.

#### Local Container Validation

Build the image from the repository root:

```bash
docker build \
  -f backend/Dockerfile \
  -t arunayandairy-api:local \
  .
```

Run the container:

```bash
docker run -d \
  --name arunayandairy-api \
  -p 8080:8080 \
  arunayandairy-api:local
```

Validated requests:

```bash
curl http://localhost:8080/
curl http://localhost:8080/health
```

The container started with:

```text
Listening address:    http://[::]:8080
Hosting environment: Production
Health result:        200 Healthy
```

### Phase 3.3: Amazon ECR

#### ECR Repository

Created private repository:

```text
Repository: arunayandairy-api
Region:     ap-south-1
Registry:   659093653742.dkr.ecr.ap-south-1.amazonaws.com
```

ECR stores versioned backend container images for ECS deployments.

#### Initial Image And Architecture Issue

The first image, `arunayandairy-api:1.0`, was built on an Apple Silicon Mac. Its ARM64 platform did not match the ECS Fargate task's `linux/amd64` runtime.

```text
Apple Silicon host
    |
ARM64 image
    |
AMD64 ECS task
    |
CannotPullContainerError
```

The platform error reported that the manifest did not contain a descriptor matching `linux/amd64`.

#### Architecture Fix

The image was rebuilt explicitly for AMD64 using the correct Dockerfile path:

```bash
docker buildx build \
  --platform linux/amd64 \
  -f backend/Dockerfile \
  -t arunayandairy-api:1.0-amd64 \
  --load \
  .
```

The AMD64 image was tagged as release `1.1` and pushed to ECR:

```bash
docker tag \
  arunayandairy-api:1.0-amd64 \
  659093653742.dkr.ecr.ap-south-1.amazonaws.com/arunayandairy-api:1.1

docker push \
  659093653742.dkr.ecr.ap-south-1.amazonaws.com/arunayandairy-api:1.1
```

ECR image:

```text
659093653742.dkr.ecr.ap-south-1.amazonaws.com/arunayandairy-api:1.1
```

The ECR push completed successfully and provided an ECS-compatible AMD64 image with this verified digest:

```text
sha256:7e55d861f9b69977b6cb8cc92fd084b9ae41ccb63f28026c17ab10a4439a23d5
```

### Phase 3.4: ECS Fargate Deployment

#### ECS Cluster

Created cluster:

```text
ArunayanDairy-Dev-Cluster
```

The cluster is the logical environment that manages the backend ECS services and Fargate tasks.

#### ECS Task Execution Role

Created IAM role:

```text
ArunayanDairy-Dev-ECS-TaskExecutionRole
```

Attached AWS-managed policy:

```text
AmazonECSTaskExecutionRolePolicy
```

The role allows ECS to:

- Pull the private image from Amazon ECR
- Send container logs to Amazon CloudWatch Logs

#### ECS Task Definition

Created task definition:

```text
ArunayanDairy-Dev-API
```

Task configuration:

```text
Launch compatibility: AWS Fargate
Container name:       arunayandairy-api
Container image:      ECR arunayandairy-api:1.1
Container port:       8080
Runtime platform:     Linux/X86_64
Logging:              Amazon CloudWatch
CPU and memory:       Configured for the development workload
```

The task definition acts as the versioned deployment blueprint for the API container.

#### ECS Service

Created service:

```text
ArunayanDairy-Dev-API-Service
```

Service configuration:

```text
Launch type:   Fargate
Desired count: 1
Network:       Private application subnets
Public IP:     Disabled
```

The ECS service maintains the desired number of API tasks and replaces failed tasks automatically.

#### Current Backend Architecture

```text
Amazon ECR
arunayandairy-api:1.1
    |
ArunayanDairy-Dev-Cluster
    |
ArunayanDairy-Dev-API-Service
    |
Fargate Task in Private Subnet
    |
ArunayanDairy.Api
    |
Port 8080
```

### Phase 3 Completion Status

| Component | Status |
|---|---|
| .NET 8 API | Completed |
| Root and health endpoints | Completed |
| Release build validation | Completed |
| Multi-stage Docker image | Completed |
| Local container testing | Completed |
| Private ECR repository | Completed |
| AMD64 image build and push | Completed |
| ECS cluster | Completed |
| ECS task execution role | Completed |
| ECS task definition | Completed |
| ECS Fargate service | Completed |
| Fargate container running | Completed |
| Application Load Balancer | Pending |
| Public API domain and HTTPS | Pending |
| Database and Secrets Manager integration | Pending |

## Current Project Status

| Phase | Component | Status |
|---|---|---|
| Phase 0 | Architecture planning | Completed |
| Phase 1 | AWS network foundation | Completed |
| Phase 2 | Frontend hosting | Completed |
| Phase 2.5 | Custom frontend domain and SSL | Completed |
| Phase 3.1 | Backend API preparation | Completed |
| Phase 3.2 | Dockerization | Completed |
| Phase 3.3 | Amazon ECR | Completed |
| Phase 3.4 | ECS Fargate deployment | Completed |
| Phase 3.5 | Application Load Balancer | Pending |
| Phase 3.6 | Custom API domain | Pending |
| Phase 3.7 | Backend HTTPS | Pending |
| Phase 3.8 | Backend configuration and RDS integration | Pending |
| Phase 4 | Database setup | Pending |
| Phase 5 | CI/CD pipeline | Pending |
| Phase 6 | Monitoring and security hardening | Pending |

## Remaining Backend Work

### Phase 3.5: Application Load Balancer

Add the internet-facing entry point for the private ECS service:

```text
Internet
   |
Application Load Balancer
   |
Target Group
   |
ECS Fargate Task
   |
.NET API on port 8080
```

Planned configuration:

- Internet-facing Application Load Balancer in both public subnets
- IP target group for Fargate tasks on port `8080`
- Target group health check path `/health`
- ALB security group allowing public HTTP and HTTPS
- ECS security group allowing port `8080` only from the ALB security group
- ECS service registration with the target group

### Phase 3.6: Custom API Domain

Create a Route 53 alias for:

```text
api.arunayandairy.store
```

Request flow:

```text
Route 53
  |
Application Load Balancer
  |
ECS API Service
```

### Phase 3.7: HTTPS

Attach an ACM certificate to the ALB HTTPS listener on port `443` and redirect HTTP port `80` to HTTPS.

### Phase 3.8: Backend Configuration

Planned work:

- Add environment-specific ECS task variables
- Store credentials in AWS Secrets Manager
- Create and configure Amazon RDS for MySQL
- Add the database connection and readiness health check
- Restrict database access to the ECS task security group
- Add CloudWatch metrics, alarms, and production log retention

At this milestone, ArunayanDairy has moved from a local .NET API to a containerized backend running on Amazon ECS Fargate in private subnets.
