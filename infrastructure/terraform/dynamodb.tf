# Single-table design (PRD §16). Keys are generic strings; entity shapes live
# in the app's repositories, not here.
resource "aws_dynamodb_table" "main" {
  name         = var.table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  # Generic overloaded GSI for secondary access patterns. Items opt in by
  # writing GSI1PK/GSI1SK (sparse index).
  global_secondary_index {
    name            = "GSI1"
    projection_type = "ALL"

    # key_schema replaces the deprecated GSI hash_key/range_key (AWS provider 6.x).
    key_schema {
      attribute_name = "GSI1PK"
      key_type       = "HASH"
    }

    key_schema {
      attribute_name = "GSI1SK"
      key_type       = "RANGE"
    }
  }

  point_in_time_recovery {
    enabled = true
  }

  # Encryption at rest with the AWS-owned key is always on; enabling it here
  # switches to the AWS-managed aws/dynamodb KMS key.
  server_side_encryption {
    enabled = true
  }

  deletion_protection_enabled = true

  lifecycle {
    prevent_destroy = true
  }
}
