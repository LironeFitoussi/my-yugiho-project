# Application credentials for the Render web service.
#
# Why an IAM user with a static access key: Render runs outside AWS. It has no
# EC2/ECS instance role and no OIDC identity-federation issuer the app could use
# with sts:AssumeRoleWithWebIdentity, so short-lived role credentials are not
# available out of the box (PRD §5). The practical least-privilege option is a
# dedicated IAM user that:
#   - has no console access and no permissions beyond the one table below,
#   - has its key stored only in Render's secret env vars (sync: false),
#   - is rotated periodically (create a second key, update Render, delete the
#     old key; or taint/replace aws_iam_access_key.app).
# Local development should use a short-lived IAM Identity Center profile, not
# this key.

resource "aws_iam_user" "app" {
  name = local.app_user_name
  path = "/app/"
}

data "aws_iam_policy_document" "app_dynamodb" {
  statement {
    sid    = "YugiohCollectionTableAccess"
    effect = "Allow"

    # Exactly what the app's repositories use. No Scan (app paths use Query
    # only), no table-management actions, no wildcards.
    #
    # TransactWriteItems / TransactGetItems are not IAM actions of their own:
    # per AWS docs ("Using IAM with DynamoDB transactions",
    # docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis-iam.html),
    # each Put/Update/Delete/Get inside a transaction is authorized by
    # PutItem/UpdateItem/DeleteItem/GetItem, and ConditionCheck by
    # ConditionCheckItem.
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
      "dynamodb:BatchGetItem",
      "dynamodb:BatchWriteItem",
      "dynamodb:ConditionCheckItem",
      "dynamodb:DescribeTable",
    ]

    resources = [
      aws_dynamodb_table.main.arn,
      "${aws_dynamodb_table.main.arn}/index/*",
    ]
  }
}

resource "aws_iam_policy" "app_dynamodb" {
  name        = "${local.app_user_name}-dynamodb"
  path        = "/app/"
  description = "Least-privilege access for the ${local.project} app to its single DynamoDB table and its indexes."
  policy      = data.aws_iam_policy_document.app_dynamodb.json
}

resource "aws_iam_user_policy_attachment" "app_dynamodb" {
  user       = aws_iam_user.app.name
  policy_arn = aws_iam_policy.app_dynamodb.arn
}

# NOTE: the secret access key is stored in Terraform state in plaintext. State
# lives in the bootstrapped S3 bucket (SSE-KMS, versioned, public access
# blocked, TLS-only) and access to it must be IAM-restricted to the operator.
# Read it once with `terraform output -raw app_secret_access_key`, paste it
# into Render as a secret env var, and never commit it.
resource "aws_iam_access_key" "app" {
  user = aws_iam_user.app.name
}
