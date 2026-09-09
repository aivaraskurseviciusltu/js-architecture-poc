locals {
  name_prefix = "${var.project}-${var.environment}"
}

module "network" {
  source = "./modules/network"

  name_prefix          = local.name_prefix
  vpc_cidr             = var.vpc_cidr
  availability_zones   = var.availability_zones
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
}

module "eks" {
  source = "./modules/eks"

  name_prefix         = local.name_prefix
  vpc_id              = module.network.vpc_id
  private_subnet_ids  = module.network.private_subnet_ids
  cluster_version     = var.eks_cluster_version
  node_instance_types = var.eks_node_instance_types
  node_min_size       = var.eks_node_min_size
  node_max_size       = var.eks_node_max_size
  node_desired_size   = var.eks_node_desired_size
}

module "mongodb" {
  source = "./modules/mongodb"

  name_prefix        = local.name_prefix
  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids
  eks_node_sg_id     = module.eks.node_security_group_id
  instance_class     = var.docdb_instance_class
  instance_count     = var.docdb_instance_count
  master_username    = var.docdb_master_username
  master_password    = var.docdb_master_password
}

module "elasticache" {
  source = "./modules/elasticache"

  name_prefix        = local.name_prefix
  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids
  eks_node_sg_id     = module.eks.node_security_group_id
  node_type          = var.redis_node_type
  num_cache_nodes    = var.redis_num_cache_nodes
}

module "messaging" {
  source = "./modules/messaging"

  name_prefix = local.name_prefix
}

module "iam" {
  source = "./modules/iam"

  name_prefix            = local.name_prefix
  eks_oidc_issuer_url    = module.eks.oidc_issuer_url
  sns_topic_arn          = module.messaging.sns_topic_arn
  inventory_queue_arn    = module.messaging.inventory_queue_arn
  notification_queue_arn = module.messaging.notification_queue_arn
  docdb_secret_arn       = module.mongodb.secret_arn
}

module "ecr" {
  source = "./modules/ecr"

  name_prefix = local.name_prefix
  app_names   = ["order-service", "inventory-service", "notification-service", "bff", "frontend"]
}
