# Credentials come from the operator's environment (prefer a short-lived
# IAM Identity Center profile via AWS_PROFILE). Never put keys in .tf files.
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}
