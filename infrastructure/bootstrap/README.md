# Terraform state bootstrap

Creates the S3 bucket that stores remote state for `infrastructure/terraform`
(PRD §5: separately bootstrapped, versioned, encrypted, public access blocked,
native S3 locking via `use_lockfile`, no DynamoDB lock table).

This stack uses **local state** (`terraform.tfstate` in this folder, gitignored).
Keep a private backup of it. The bucket has `prevent_destroy`.

## Usage

Run with an admin-capable, short-lived AWS profile (for example IAM Identity Center):

```bash
cd infrastructure/bootstrap
terraform init
terraform fmt -check && terraform validate
terraform plan            # review
terraform apply           # only after explicit approval
terraform output          # -> state_bucket_name, state_bucket_region
```

Next, copy `infrastructure/terraform/backend.hcl.example` to `backend.hcl`,
fill in the bucket name and region from the outputs, and run
`terraform init -backend-config=backend.hcl` in `infrastructure/terraform`.

To override the default bucket name (`yugioh-collection-tfstate-<account_id>`),
pass `-var state_bucket_name=...`.

## Access

The bucket policy only denies non-TLS requests; it grants nothing. IAM controls
access: only the operator identity that runs Terraform should hold
`s3:ListBucket` on the bucket and `s3:GetObject`/`s3:PutObject`/`s3:DeleteObject`
on `yugioh-collection/*`. The app's IAM user has no access to it.
