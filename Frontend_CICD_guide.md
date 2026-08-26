# ArunayanDairy Frontend CI/CD Guide

This document records the automated deployment of the ArunayanDairy static frontend, including the architecture, AWS configuration, GitHub Actions workflow, troubleshooting, and verification.

## Objective

The frontend was initially deployed manually:

```text
Developer -> upload frontend files -> S3 -> CloudFront -> Route 53
```

The completed delivery path removes the manual upload step:

```text
Developer
	|
	| git push origin dev
	v
GitHub Actions
	|
	+-- Validate index.html, app.js, and styles.css
	+-- Authenticate to AWS with GitHub OIDC
	+-- Sync static files to S3
	+-- Invalidate CloudFront
	v
https://frontend.arunayandairy.store
```

GitHub OIDC gives each workflow run short-lived AWS credentials. No long-lived AWS access keys are stored in GitHub.

## Application And Branch

Repository:

```text
Mahesh199811/ArunayanDairy_3tier_App
```

Deployment branch:

```text
dev
```

The frontend is static and has no npm build step:

```text
index.html
app.js
styles.css
```

The pipeline deploys these files directly, so `npm install` and `npm run build` are not required.

## AWS Frontend Architecture

```text
Route 53
	|
	v
frontend.arunayandairy.store
	|
	v
CloudFront distribution: E11CTYG773TKA8
	|
	v
Private S3 bucket: arunayandairy-dev-frontend-mahesh-2026
```

CloudFront provides HTTPS delivery and caching. S3 holds the frontend assets. Route 53 supplies the custom DNS name.

## OIDC Authentication

The workflow authenticates by exchanging a GitHub-issued OIDC token for temporary AWS credentials:

```text
GitHub Actions
	|
	| OIDC token
	v
AWS STS AssumeRoleWithWebIdentity
	|
	v
GitHubActions-ArunayanDairy-Frontend IAM role
	|
	v
Temporary AWS credentials
```

AWS OIDC provider:

```text
token.actions.githubusercontent.com
Audience: sts.amazonaws.com
```

IAM role:

```text
arn:aws:iam::659093653742:role/GitHubActions-ArunayanDairy-Frontend
```

The role trust policy is restricted to the `dev` branch of this repository. The repository was created after GitHub's July 2026 immutable-subject change, so the expected `sub` claim is:

```text
repo:Mahesh199811@104351675/ArunayanDairy_3tier_App@1342515019:ref:refs/heads/dev
```

This is more restrictive than allowing every repository owned by an account to assume the deployment role.

## Least-Privilege Permissions

The deployment role requires only the following operations:

```json
{
	"Statement": [
		{
			"Sid": "ListFrontendBucket",
			"Effect": "Allow",
			"Action": "s3:ListBucket",
			"Resource": "arn:aws:s3:::arunayandairy-dev-frontend-mahesh-2026"
		},
		{
			"Sid": "DeployFrontendFiles",
			"Effect": "Allow",
			"Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
			"Resource": "arn:aws:s3:::arunayandairy-dev-frontend-mahesh-2026/*"
		},
		{
			"Sid": "InvalidateCloudFront",
			"Effect": "Allow",
			"Action": "cloudfront:CreateInvalidation",
			"Resource": "arn:aws:cloudfront::659093653742:distribution/E11CTYG773TKA8"
		}
	]
}
```

The role has no broad administrator access and no permanent keys are stored in GitHub.

## GitHub Actions Workflow

The workflow is [frontend-cicd.yml](.github/workflows/frontend-cicd.yml).

It runs automatically when a commit is pushed to `dev` and can also be started manually using `workflow_dispatch`.

```yaml
on:
	push:
		branches:
			- dev
	workflow_dispatch:

permissions:
	id-token: write
	contents: read
```

`id-token: write` permits the runner to request an OIDC token. It does not grant write access to the repository.

Workflow environment values:

```text
AWS_REGION: ap-south-1
S3_BUCKET: arunayandairy-dev-frontend-mahesh-2026
CLOUDFRONT_DISTRIBUTION_ID: E11CTYG773TKA8
```

### Pipeline Steps

1. **Checkout repository** using `actions/checkout@v4`.
2. **Validate frontend files** with `test -f index.html`, `test -f app.js`, and `test -f styles.css`.
3. **Configure AWS credentials** using `aws-actions/configure-aws-credentials@v6` and the OIDC IAM role.
4. **Verify AWS identity** using `aws sts get-caller-identity`.
5. **Deploy to S3** using `aws s3 sync`.
6. **Invalidate CloudFront** using `aws cloudfront create-invalidation --paths "/*"`.
7. **Report the deployment URL**.

The S3 sync intentionally excludes repository and backend files:

```text
.git/*
.github/*
backend/*
tools/*
ArunayanDairy.sln
README.md
INTERVIEW-GUIDE.md
```

## Successful Deployment Flow

```text
git push origin dev
	|
	v
GitHub Actions starts
	|
	+-- Checkout repository                 OK
	+-- Validate frontend files             OK
	+-- Configure AWS credentials with OIDC OK
	+-- Verify AWS identity                 OK
	+-- Sync files to S3                    OK
	+-- Invalidate CloudFront               OK
	v
Updated frontend.arunayandairy.store
```

## Troubleshooting History

### OIDC AssumeRoleWithWebIdentity Failure

**Symptom**

```text
Not authorized to perform: sts:AssumeRoleWithWebIdentity
```

**Root cause**

The IAM trust policy used GitHub's older repository subject format:

```text
repo:Mahesh199811/ArunayanDairy_3tier_App:ref:refs/heads/dev
```

This repository uses GitHub's immutable subject format instead.

**Resolution**

The trust policy was updated to use the immutable owner and repository IDs:

```text
repo:Mahesh199811@104351675/ArunayanDairy_3tier_App@1342515019:ref:refs/heads/dev
```

After that change, AWS authentication and `aws sts get-caller-identity` succeeded.

**Lesson**

For OIDC errors, identify the failure stage first. An STS assumption failure happens before S3 permissions are evaluated, so changing bucket permissions would not have helped.

### Workflow Trigger Confusion

There are three distinct states:

```text
Workflow did not start
Workflow started but failed
Workflow succeeded but the browser still shows old content
```

To diagnose a missing run, confirm the workflow is on the pushed branch, verify `git branch --show-current` returns `dev`, and push with `git push origin dev`.

### CSS Did Not Appear Immediately

The workflow and S3 sync succeeded, but the browser initially displayed old CSS. CloudFront invalidation is already part of the workflow, so investigate caching in this order:

1. Hard refresh the browser.
2. Test in an incognito/private window.
3. Check the S3 object's modification time.
4. Check the CloudFront invalidation status.
5. Check browser caching behavior.

Verify the deployed object directly:

```bash
aws s3api head-object \
	--bucket arunayandairy-dev-frontend-mahesh-2026 \
	--key styles.css
```

## Troubleshooting Decision Tree

```text
git push origin dev
	|
	v
Did GitHub Actions start?
	|                    |
 no                   yes
	|                    |
Check trigger         Did a step fail?
											 |
											 +-- OIDC / STS: inspect trust policy, audience, and sub claim
											 +-- S3: inspect bucket and object ARN permissions
											 +-- CloudFront: inspect distribution ARN and invalidation permission
											 +-- Browser: inspect CloudFront and browser cache
```

Common failure mapping:

| Error | Likely cause | Check |
|---|---|---|
| `AssumeRoleWithWebIdentity` access denied | OIDC trust policy mismatch | issuer, audience, subject, repository, branch |
| `s3:PutObject` access denied | Missing object-level S3 permission | bucket object ARN and `s3:PutObject` |
| `cloudfront:CreateInvalidation` access denied | Missing distribution permission | CloudFront distribution ARN |
| Deployment succeeds but site is stale | CDN or browser cache | invalidation status and a hard refresh |

## CI And CD In This Project

The CI portion validates that the required frontend files exist. The CD portion assumes the restricted AWS role, synchronizes static content to S3, invalidates CloudFront, and makes the release available on the production URL.

```text
CI: git push -> checkout -> validate files
CD: OIDC -> S3 sync -> CloudFront invalidation -> live frontend
```

## Interview Answer

**How did you implement frontend CI/CD?**

> I configured GitHub Actions to deploy the static frontend whenever code is pushed to the `dev` branch. The workflow checks out the repository and verifies the HTML, CSS, and JavaScript files. It then authenticates to AWS through GitHub OIDC rather than long-lived access keys. GitHub assumes a dedicated least-privilege IAM role, syncs the frontend files to the S3 origin, and invalidates CloudFront so the updated content is served through `frontend.arunayandairy.store`.

**What challenge did you solve?**

> The OIDC role assumption initially failed with `sts:AssumeRoleWithWebIdentity` access denied. I determined that the failure occurred before S3 access, so I inspected the IAM trust relationship rather than the S3 policy. The repository uses GitHub's immutable OIDC subject format, while the trust policy used the legacy format. I updated the subject restriction to use the owner and repository IDs with the `dev` branch, after which the workflow received temporary credentials and deployed successfully.

## Current Status

```text
GitHub repository and dev trigger       Complete
GitHub Actions workflow                 Complete
OIDC AWS authentication                 Complete
Least-privilege IAM role                Complete
Frontend validation                     Complete
S3 deployment                           Complete
CloudFront invalidation                 Complete
Route 53 frontend domain                Complete
End-to-end automated deployment         Complete
```

The operational deployment command is:

```bash
git push origin dev
```
