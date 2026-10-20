provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "yugioh-collection"
      ManagedBy = "terraform"
      Stack     = "tfstate-bootstrap"
    }
  }
}
