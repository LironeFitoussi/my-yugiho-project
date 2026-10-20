variable "aws_region" {
  description = "AWS region for the Terraform state bucket."
  type        = string
  default     = "eu-central-1"
}

variable "state_bucket_name" {
  description = "Name of the S3 bucket holding Terraform state. Leave null to use yugioh-collection-tfstate-<account_id>."
  type        = string
  default     = null
}

variable "noncurrent_version_expiration_days" {
  description = "Days to keep noncurrent (superseded) state object versions before expiring them."
  type        = number
  default     = 90
}
