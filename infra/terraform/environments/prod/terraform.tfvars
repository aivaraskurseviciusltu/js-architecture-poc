# environments/prod/terraform.tfvars
# Use with: terraform apply -var-file=environments/prod/terraform.tfvars
#
# IMPORTANT: do NOT commit real passwords here.
# Pass secrets via:
#   export TF_VAR_docdb_master_password="<secret>"
# or via a secrets manager integration in CI/CD.

environment = "prod"
aws_region  = "eu-north-1"

availability_zones   = ["eu-north-1a", "eu-north-1b", "eu-north-1c"]
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
private_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]

eks_cluster_version     = "1.32"
eks_node_instance_types = ["t3.medium"]
eks_node_min_size       = 2
eks_node_max_size       = 6
eks_node_desired_size   = 2

docdb_instance_class  = "db.t3.medium"
docdb_instance_count  = 2
docdb_master_username = "pocadmin"
# docdb_master_password — set via TF_VAR_docdb_master_password env var

redis_node_type       = "cache.t3.micro"
redis_num_cache_nodes = 2
