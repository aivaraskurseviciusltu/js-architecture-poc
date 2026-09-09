# S3 + DynamoDB remote backend.
# Uncomment and fill in for production use.
# For local development, state is stored locally.

# terraform {
#   backend "s3" {
#     bucket         = "<YOUR_BUCKET_NAME>"
#     key            = "poc/terraform.tfstate"
#     region         = "us-east-1"
#     encrypt        = true
#     dynamodb_table = "<YOUR_LOCK_TABLE>"
#   }
# }
