terraform {
  # >= 1.10 is required for native S3 state locking (use_lockfile).
  required_version = ">= 1.10.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # Partial configuration: bucket, key, region, encrypt and use_lockfile come
  # from backend.hcl (copy backend.hcl.example). The bucket is created by
  # infrastructure/bootstrap. Locking uses the native S3 lockfile, not a
  # legacy DynamoDB lock table (PRD §5).
  #   terraform init -backend-config=backend.hcl
  backend "s3" {}
}
