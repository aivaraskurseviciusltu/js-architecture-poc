resource "aws_security_group" "docdb" {
  name        = "${var.name_prefix}-docdb-sg"
  description = "Allow DocumentDB access from EKS nodes only"
  vpc_id      = var.vpc_id

  ingress {
    description     = "MongoDB from EKS nodes"
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [var.eks_node_sg_id]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"] #tfsec:ignore:aws-ec2-no-public-egress-sgr
  }

  tags = { Name = "${var.name_prefix}-docdb-sg" }
}

resource "aws_docdb_subnet_group" "main" {
  name       = "${var.name_prefix}-docdb-subnet-group"
  subnet_ids = var.private_subnet_ids
  tags       = { Name = "${var.name_prefix}-docdb-subnet-group" }
}

resource "aws_docdb_cluster_parameter_group" "main" {
  family      = "docdb5.0"
  name        = "${var.name_prefix}-docdb-params"
  description = "DocumentDB cluster parameter group"

  parameter {
    name  = "tls"
    value = "enabled"
  }
}

resource "aws_docdb_cluster" "main" {
  cluster_identifier              = "${var.name_prefix}-docdb"
  engine                          = "docdb"
  engine_version                  = "5.0.0"
  master_username                 = var.master_username
  master_password                 = var.master_password
  db_subnet_group_name            = aws_docdb_subnet_group.main.name
  vpc_security_group_ids          = [aws_security_group.docdb.id]
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.main.name
  storage_encrypted               = true
  backup_retention_period         = 7
  preferred_backup_window         = "02:00-03:00"
  skip_final_snapshot             = false
  final_snapshot_identifier       = "${var.name_prefix}-docdb-final"

  tags = { Name = "${var.name_prefix}-docdb" }
}

resource "aws_docdb_cluster_instance" "main" {
  count              = var.instance_count
  identifier         = "${var.name_prefix}-docdb-${count.index}"
  cluster_identifier = aws_docdb_cluster.main.id
  instance_class     = var.instance_class

  tags = { Name = "${var.name_prefix}-docdb-${count.index}" }
}

# ── Credentials in Secrets Manager ───────────────────────────────────────────
resource "aws_secretsmanager_secret" "docdb" {
  name                    = "${var.name_prefix}/docdb/credentials"
  recovery_window_in_days = 7
  # tfsec:ignore:aws-ssm-secret-use-customer-key
  tags = { Name = "${var.name_prefix}-docdb-secret" }
}

resource "aws_secretsmanager_secret_version" "docdb" {
  secret_id = aws_secretsmanager_secret.docdb.id
  secret_string = jsonencode({
    username          = var.master_username
    password          = var.master_password
    host              = aws_docdb_cluster.main.endpoint
    port              = 27017
    connection_string = "mongodb://${var.master_username}:${var.master_password}@${aws_docdb_cluster.main.endpoint}:27017/?tls=true&tlsCAFile=/etc/ssl/certs/rds-combined-ca-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"
  })
}
