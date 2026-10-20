terraform {
  required_version = ">= 1.10.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # Intentionally no backend block: the bootstrap stack uses LOCAL state.
  # It creates the bucket that holds the main stack's remote state, so it
  # cannot store its own state there (chicken-and-egg). terraform.tfstate here
  # is gitignored; keep a private backup of it.
}
