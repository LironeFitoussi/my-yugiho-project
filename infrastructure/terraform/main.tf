data "aws_caller_identity" "current" {}

locals {
  project = "yugioh-collection"

  # IAM user the Render web service authenticates as.
  app_user_name = "${local.project}-app"

  common_tags = {
    Project     = local.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
