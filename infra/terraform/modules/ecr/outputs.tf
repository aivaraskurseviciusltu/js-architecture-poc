output "repository_urls" {
  description = "Map of app name to ECR repository URL"
  value       = { for k, v in aws_ecr_repository.apps : k => v.repository_url }
}
