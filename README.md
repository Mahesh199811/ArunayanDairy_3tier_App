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

## Next Phase

Phase 2 will build the frontend tier using:

```text
S3
CloudFront
Route53
IAM
CloudWatch
```

The frontend will be hosted in S3 and served globally through CloudFront. Route53 will point the project domain to CloudFront.
