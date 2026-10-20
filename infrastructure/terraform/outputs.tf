output "table_name" {
  description = "DynamoDB table name (DYNAMODB_TABLE)."
  value       = aws_dynamodb_table.main.name
}

output "table_arn" {
  description = "DynamoDB table ARN."
  value       = aws_dynamodb_table.main.arn
}

output "app_user_name" {
  description = "IAM user the Render service authenticates as."
  value       = aws_iam_user.app.name
}

output "app_access_key_id" {
  description = "Access key ID for the app user (AWS_ACCESS_KEY_ID in Render)."
  value       = aws_iam_access_key.app.id
}

output "app_secret_access_key" {
  description = "Secret access key for the app user (AWS_SECRET_ACCESS_KEY in Render). Read with `terraform output -raw app_secret_access_key`."
  value       = aws_iam_access_key.app.secret
  sensitive   = true
}
