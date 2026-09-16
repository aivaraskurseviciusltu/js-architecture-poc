output "order_service_role_arn" { value = aws_iam_role.order_service.arn }
output "inventory_service_role_arn" { value = aws_iam_role.inventory_service.arn }
output "notification_service_role_arn" { value = aws_iam_role.notification_service.arn }
output "bff_role_arn" { value = aws_iam_role.bff.arn }
