---
name: infra-change
description: Change AWS infrastructure in infrastructure/terraform (DynamoDB table, indexes, IAM, state backend) or the render.yaml blueprint (PRD §4, §5, §20). Plans only; never applies.
disable-model-invocation: true
argument-hint: "<what to change>"
---

# Infrastructure change

Target: `$ARGUMENTS`

Terraform is the only AWS IaC tool. No CDK, CloudFormation, Serverless, or Terragrunt, and no console changes (§2, §5).

## Layout (§5)
`infrastructure/terraform/`: `versions.tf`, `providers.tf`, `main.tf`, `dynamodb.tf`, `iam.tf`, `variables.tf`, `outputs.tf`, `terraform.tfvars.example`, `.gitignore`. Use flat files, no modules.

## Requirements checklist
- Pin Terraform and AWS provider version constraints in `versions.tf`.
- Put environment values in variables; never put secrets in `.tf`. Commit only `terraform.tfvars.example`.
- Use consistent names and `default_tags` for resource tagging.
- DynamoDB `yugioh-collection`: `PK`/`SK` strings, `PAY_PER_REQUEST`, point-in-time recovery, `deletion_protection_enabled = true`, and `lifecycle { prevent_destroy = true }` in prod.
- Add GSIs only for documented access patterns (§16).
- IAM: least privilege, scoped to the table ARN and `/index/*`, with only the actions the app uses. No `Scan`, no `*`. Treat IAM changes as security-sensitive and call them out.
- Credentials (§5): short-lived credentials (an IAM Identity Center profile) locally. Render runs outside AWS, so evaluate the options and pick the least-privileged practical one. Never assume instance roles.
- State: local state is OK for experiments only. Before prod, use a **separately bootstrapped** S3 backend with versioning, encryption, public access blocked, native S3 locking (`use_lockfile = true`, no legacy DynamoDB lock table), and IAM-restricted access.

## Validate (§22)
```bash
cd infrastructure/terraform
terraform init
terraform fmt -check
terraform validate
terraform plan
```
Summarize the plan for the user: adds, changes, destroys, IAM changes, and anything billable.

## Approval gates (§23). Stop and ask before:
`terraform apply`, creating billable resources, any delete or destroy, IAM changes, irreversible DB operations, and the first public deploy. Never run `terraform destroy` on your own.

## Render (§20)
A single Node web service in `render.yaml`, with build/start commands, a health check path, auto-deploy from GitHub, and secrets as `sync: false`. Use the `render-blueprints` skill for syntax and validate with `render blueprints validate`. Don't trigger deploys without approval.

Never commit `*.tfstate*`, `*.tfvars`, or `.env*`.
