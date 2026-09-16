variable "project" {
  description = "Project name used for resource naming and tagging"
  type        = string
  default     = "js-fullstack-poc"
}

variable "environment" {
  description = "Deployment environment (local, staging, prod)"
  type        = string
  default     = "prod"
}

variable "aws_region" {
  description = "AWS region to deploy resources into"
  type        = string
  default     = "eu-north-1"
}

variable "localstack_endpoint" {
  description = "LocalStack endpoint URL. Set to empty string for real AWS."
  type        = string
  default     = ""
}

# ── Network ──────────────────────────────────────────────────────────────────

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of AZs to spread subnets across"
  type        = list(string)
  default     = ["eu-north-1a", "eu-north-1b", "eu-north-1c"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets (one per AZ)"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets (one per AZ)"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
}

# ── EKS ──────────────────────────────────────────────────────────────────────

variable "eks_cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.32"
}

variable "eks_node_instance_types" {
  description = "EC2 instance types for EKS managed node group"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "eks_node_min_size" {
  description = "Minimum number of EKS worker nodes"
  type        = number
  default     = 2
}

variable "eks_node_max_size" {
  description = "Maximum number of EKS worker nodes"
  type        = number
  default     = 6
}

variable "eks_node_desired_size" {
  description = "Desired number of EKS worker nodes"
  type        = number
  default     = 2
}

# ── Secrets ───────────────────────────────────────────────────────────────────

variable "bff_secret_arn" {
  description = "ARN of the Secrets Manager secret holding the BFF JWT signing key. Create with: aws secretsmanager create-secret --name js-fullstack-poc-prod/bff/jwt --secret-string '{\"jwt_secret\":\"...\"}' --region eu-north-1"
  type        = string
  sensitive   = true
}

# ── DocumentDB ───────────────────────────────────────────────────────────────

variable "docdb_instance_class" {
  description = "DocumentDB instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "docdb_instance_count" {
  description = "Number of DocumentDB instances (1 primary + N replicas)"
  type        = number
  default     = 2
}

variable "docdb_master_username" {
  description = "DocumentDB master username"
  type        = string
  default     = "pocadmin"
  sensitive   = true
}

variable "docdb_master_password" {
  description = "DocumentDB master password — override via tfvars or env var TF_VAR_docdb_master_password"
  type        = string
  sensitive   = true
}

# ── ElastiCache ───────────────────────────────────────────────────────────────

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_nodes" {
  description = "Number of Redis nodes in the replication group"
  type        = number
  default     = 2
}
