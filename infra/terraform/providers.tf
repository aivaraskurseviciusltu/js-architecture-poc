terraform {
  required_version = ">= 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  # LocalStack overrides — only active when var.localstack_endpoint is set
  dynamic "endpoints" {
    for_each = var.localstack_endpoint != "" ? [1] : []
    content {
      sns            = var.localstack_endpoint
      sqs            = var.localstack_endpoint
      iam            = var.localstack_endpoint
      ecr            = var.localstack_endpoint
      secretsmanager = var.localstack_endpoint
      kms            = var.localstack_endpoint
      s3             = var.localstack_endpoint
      dynamodb       = var.localstack_endpoint
      ec2            = var.localstack_endpoint
      sts            = var.localstack_endpoint
    }
  }

  skip_credentials_validation = var.localstack_endpoint != ""
  skip_requesting_account_id  = var.localstack_endpoint != ""
  skip_metadata_api_check     = var.localstack_endpoint != ""
  access_key                  = var.localstack_endpoint != "" ? "test" : null
  secret_key                  = var.localstack_endpoint != "" ? "test" : null

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
