output "vpc_id" {
  description = "ID of the VPC"
  value       = module.network.vpc_id
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = module.network.private_subnet_ids
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = module.network.public_subnet_ids
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "ecr_repository_urls" {
  description = "Map of ECR repository URLs keyed by app name"
  value       = module.ecr.repository_urls
}

output "sns_order_events_arn" {
  description = "ARN of the SNS order-events topic"
  value       = module.messaging.sns_topic_arn
}

output "sqs_inventory_queue_url" {
  description = "URL of the inventory SQS queue"
  value       = module.messaging.inventory_queue_url
}

output "sqs_notification_queue_url" {
  description = "URL of the notification SQS queue"
  value       = module.messaging.notification_queue_url
}

output "docdb_endpoint" {
  description = "DocumentDB cluster endpoint"
  value       = module.mongodb.cluster_endpoint
  sensitive   = true
}

output "docdb_secret_arn" {
  description = "ARN of the Secrets Manager secret holding DocumentDB credentials"
  value       = module.mongodb.secret_arn
}

output "redis_endpoint" {
  description = "ElastiCache Redis primary endpoint"
  value       = module.elasticache.primary_endpoint
  sensitive   = true
}
