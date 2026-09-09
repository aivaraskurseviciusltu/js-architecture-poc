# environments/local/terraform.tfvars
# Use with: terraform apply -var-file=environments/local/terraform.tfvars
#
# Targets LocalStack at localhost:4566.
# Resources NOT supported by LocalStack (EKS, DocumentDB, ElastiCache, VPC NAT)
# will fail — use `terraform plan` only for those, or target specific modules:
#   terraform plan -target=module.messaging -target=module.ecr

environment         = "local"
localstack_endpoint = "http://localhost:4566"
aws_region          = "us-east-1"

# Minimal sizes for local validation
eks_node_min_size     = 1
eks_node_max_size     = 2
eks_node_desired_size = 1
docdb_instance_count  = 1
redis_num_cache_nodes = 1

# Dummy password — overridden by real value in prod
docdb_master_password = "localpassword"
