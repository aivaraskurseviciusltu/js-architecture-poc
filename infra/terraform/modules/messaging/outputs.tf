output "sns_topic_arn" { value = aws_sns_topic.order_events.arn }
output "inventory_queue_url" { value = aws_sqs_queue.inventory.id }
output "inventory_queue_arn" { value = aws_sqs_queue.inventory.arn }
output "notification_queue_url" { value = aws_sqs_queue.notification.id }
output "notification_queue_arn" { value = aws_sqs_queue.notification.arn }
output "inventory_dlq_arn" { value = aws_sqs_queue.inventory_dlq.arn }
output "notification_dlq_arn" { value = aws_sqs_queue.notification_dlq.arn }
output "kms_key_arn" { value = aws_kms_key.messaging.arn }
