locals {
  oidc_provider = replace(var.eks_oidc_issuer_url, "https://", "")
}

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

# ── Helper: IRSA assume-role policy ──────────────────────────────────────────
# Creates a trust policy that allows a specific k8s service account to assume the role
locals {
  irsa_assume = { for sa in ["order-service", "inventory-service", "notification-service", "bff"] :
    sa => jsonencode({
      Version = "2012-10-17"
      Statement = [{
        Effect = "Allow"
        Principal = {
          Federated = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/${local.oidc_provider}"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${local.oidc_provider}:sub" = "system:serviceaccount:poc:${sa}"
            "${local.oidc_provider}:aud" = "sts.amazonaws.com"
          }
        }
      }]
    })
  }
}

# ── Order Service IRSA role ───────────────────────────────────────────────────
resource "aws_iam_role" "order_service" {
  name               = "${var.name_prefix}-order-service-irsa"
  assume_role_policy = local.irsa_assume["order-service"]
}

resource "aws_iam_role_policy" "order_service" {
  name = "${var.name_prefix}-order-service-policy"
  role = aws_iam_role.order_service.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "PublishSNS"
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = [var.sns_topic_arn]
      },
      {
        Sid    = "ReadSecret"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [var.docdb_secret_arn]
      }
    ]
  })
}

# ── Inventory Service IRSA role ───────────────────────────────────────────────
resource "aws_iam_role" "inventory_service" {
  name               = "${var.name_prefix}-inventory-service-irsa"
  assume_role_policy = local.irsa_assume["inventory-service"]
}

resource "aws_iam_role_policy" "inventory_service" {
  name = "${var.name_prefix}-inventory-service-policy"
  role = aws_iam_role.inventory_service.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ConsumeSQS"
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = [var.inventory_queue_arn]
      },
      {
        Sid    = "ReadSecret"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [var.docdb_secret_arn]
      }
    ]
  })
}

# ── Notification Service IRSA role ────────────────────────────────────────────
resource "aws_iam_role" "notification_service" {
  name               = "${var.name_prefix}-notification-service-irsa"
  assume_role_policy = local.irsa_assume["notification-service"]
}

resource "aws_iam_role_policy" "notification_service" {
  name = "${var.name_prefix}-notification-service-policy"
  role = aws_iam_role.notification_service.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ConsumeSQS"
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = [var.notification_queue_arn]
      },
      {
        Sid    = "ReadSecret"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [var.docdb_secret_arn]
      }
    ]
  })
}

# ── BFF IRSA role ─────────────────────────────────────────────────────────────
# BFF only needs to read its JWT signing key from Secrets Manager.
# ESO assumes this role via the bff ServiceAccount's IRSA annotation.
resource "aws_iam_role" "bff" {
  name               = "${var.name_prefix}-bff-irsa"
  assume_role_policy = local.irsa_assume["bff"]
}

resource "aws_iam_role_policy" "bff" {
  name = "${var.name_prefix}-bff-policy"
  role = aws_iam_role.bff.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadJwtSecret"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [var.bff_secret_arn]
      }
    ]
  })
}
