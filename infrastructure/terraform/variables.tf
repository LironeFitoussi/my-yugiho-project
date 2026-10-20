variable "aws_region" {
  description = "AWS region for the DynamoDB table. Must match AWS_REGION in render.yaml."
  type        = string
  default     = "eu-central-1"
}

variable "table_name" {
  description = "DynamoDB single-table name. Must match DYNAMODB_TABLE in render.yaml."
  type        = string
  default     = "yugioh-collection"
}

variable "environment" {
  description = "Deployment environment, used for tagging."
  type        = string
  default     = "prod"
}
