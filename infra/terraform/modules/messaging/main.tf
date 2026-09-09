data "aws_caller_identity" "current" {}

# ── KMS key for SNS/SQS encryption ───────────────────────────────────────────
resource "aws_kms_key" "messaging" {
  description             = "KMS key for SNS/SQS messaging encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow SNS and SQS to use the key"
        Effect = "Allow"
        Principal = {
          Service = ["sns.amazonaws.com", "sqs.amazonaws.com"]
        }
        Action = [
          "kms:GenerateDataKey",
          "kms:Decrypt"
        ]
        Resource = "*"
      }
    ]
  })

  tags = { Name = "${var.name_prefix}-messaging-kms" }
}

resource "aws_kms_alias" "messaging" {
  name          = "alias/${var.name_prefix}-messaging"
  target_key_id = aws_kms_key.messaging.key_id
}

# ── SNS Topic ─────────────────────────────────────────────────────────────────
resource "aws_sns_topic" "order_events" {
  name              = "${var.name_prefix}-order-events"
  kms_master_key_id = aws_kms_key.messaging.id

  tags = { Name = "${var.name_prefix}-order-events" }
}

# ── Dead Letter Queues ────────────────────────────────────────────────────────
resource "aws_sqs_queue" "inventory_dlq" {
  name                      = "${var.name_prefix}-inventory-dlq"
  message_retention_seconds = 1209600 # 14 days
  kms_master_key_id         = aws_kms_key.messaging.id

  tags = { Name = "${var.name_prefix}-inventory-dlq" }
}

resource "aws_sqs_queue" "notification_dlq" {
  name                      = "${var.name_prefix}-notification-dlq"
  message_retention_seconds = 1209600
  kms_master_key_id         = aws_kms_key.messaging.id

  tags = { Name = "${var.name_prefix}-notification-dlq" }
}

# ── Main Queues ───────────────────────────────────────────────────────────────
resource "aws_sqs_queue" "inventory" {
  name                       = "${var.name_prefix}-inventory-queue"
  visibility_timeout_seconds = 30
  message_retention_seconds  = 86400
  kms_master_key_id          = aws_kms_key.messaging.id

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.inventory_dlq.arn
    maxReceiveCount     = 3
  })

  tags = { Name = "${var.name_prefix}-inventory-queue" }
}

resource "aws_sqs_queue" "notification" {
  name                       = "${var.name_prefix}-notification-queue"
  visibility_timeout_seconds = 30
  message_retention_seconds  = 86400
  kms_master_key_id          = aws_kms_key.messaging.id

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.notification_dlq.arn
    maxReceiveCount     = 3
  })

  tags = { Name = "${var.name_prefix}-notification-queue" }
}

# ── SQS Queue Policies (allow SNS to send) ────────────────────────────────────
resource "aws_sqs_queue_policy" "inventory" {
  queue_url = aws_sqs_queue.inventory.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.inventory.arn
      Condition = {
        ArnEquals = { "aws:SourceArn" = aws_sns_topic.order_events.arn }
      }
    }]
  })
}

resource "aws_sqs_queue_policy" "notification" {
  queue_url = aws_sqs_queue.notification.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.notification.arn
      Condition = {
        ArnEquals = { "aws:SourceArn" = aws_sns_topic.order_events.arn }
      }
    }]
  })
}

# ── SNS Subscriptions ─────────────────────────────────────────────────────────
resource "aws_sns_topic_subscription" "inventory" {
  topic_arn            = aws_sns_topic.order_events.arn
  protocol             = "sqs"
  endpoint             = aws_sqs_queue.inventory.arn
  raw_message_delivery = true
}

resource "aws_sns_topic_subscription" "notification" {
  topic_arn            = aws_sns_topic.order_events.arn
  protocol             = "sqs"
  endpoint             = aws_sqs_queue.notification.arn
  raw_message_delivery = true
}
