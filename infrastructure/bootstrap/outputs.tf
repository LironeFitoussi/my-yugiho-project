output "state_bucket_name" {
  description = "S3 bucket for Terraform remote state. Use as `bucket` in infrastructure/terraform/backend.hcl."
  value       = aws_s3_bucket.tfstate.bucket
}

output "state_bucket_region" {
  description = "Region of the state bucket. Use as `region` in infrastructure/terraform/backend.hcl."
  value       = var.aws_region
}
