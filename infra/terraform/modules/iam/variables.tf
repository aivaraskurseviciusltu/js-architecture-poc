variable "name_prefix" { type = string }
variable "eks_oidc_issuer_url" { type = string }
variable "sns_topic_arn" { type = string }
variable "inventory_queue_arn" { type = string }
variable "notification_queue_arn" { type = string }
variable "docdb_secret_arn" { type = string }
variable "bff_secret_arn" {
  type        = string
  description = "ARN of the Secrets Manager secret holding the BFF JWT signing key (js-fullstack-poc-prod/bff/jwt)."
}
