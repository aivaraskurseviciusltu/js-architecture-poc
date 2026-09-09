variable "name_prefix" { type = string }
variable "eks_oidc_issuer_url" { type = string }
variable "sns_topic_arn" { type = string }
variable "inventory_queue_arn" { type = string }
variable "notification_queue_arn" { type = string }
variable "docdb_secret_arn" { type = string }
variable "environment" { type = string }
