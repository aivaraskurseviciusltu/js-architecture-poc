# ── VPC ───────────────────────────────────────────────────────────────────────
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${var.name_prefix}-vpc" }
}

# ── Subnets ───────────────────────────────────────────────────────────────────
resource "aws_subnet" "public" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.public_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  # tfsec:ignore:aws-ec2-no-public-ip-subnet -- public subnets are intentional for the load balancer tier
  map_public_ip_on_launch = true

  tags = {
    Name                     = "${var.name_prefix}-public-${count.index + 1}"
    "kubernetes.io/role/elb" = "1"
  }
}

resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name                              = "${var.name_prefix}-private-${count.index + 1}"
    "kubernetes.io/role/internal-elb" = "1"
  }
}

# ── Internet Gateway (public subnet / ALB only) ───────────────────────────────
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.name_prefix}-igw" }
}

# ── Route Tables ──────────────────────────────────────────────────────────────

# Public route table — ALB needs internet access for inbound user traffic
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${var.name_prefix}-rt-public" }
}

resource "aws_route_table_association" "public" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Private route table — no internet route; all AWS service traffic uses VPC Endpoints
resource "aws_route_table" "private" {
  count  = length(var.availability_zones)
  vpc_id = aws_vpc.main.id

  # No 0.0.0.0/0 route — private subnet has no internet access by design.
  # EKS pods reach ECR, SNS, SQS, and Secrets Manager via Interface VPC Endpoints below.

  tags = { Name = "${var.name_prefix}-rt-private-${count.index + 1}" }
}

resource "aws_route_table_association" "private" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# ── Security Group for VPC Endpoints ──────────────────────────────────────────
# Allows HTTPS (443) from within the VPC so pods can reach Interface Endpoints
resource "aws_security_group" "vpc_endpoints" {
  name        = "${var.name_prefix}-vpce-sg"
  description = "Allow HTTPS from within the VPC to Interface Endpoints"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTPS from VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"] #tfsec:ignore:aws-ec2-no-public-egress-sgr
  }

  tags = { Name = "${var.name_prefix}-vpce-sg" }
}

# ── VPC Endpoints ─────────────────────────────────────────────────────────────
# Interface Endpoints — private DNS so pods call the same SDK endpoints,
# traffic stays on the AWS backbone and never reaches the public internet.

locals {
  interface_endpoints = [
    "ecr.api",
    "ecr.dkr",
    "sns",
    "sqs",
    "secretsmanager",
    "logs",         # CloudWatch Logs (EKS audit + Flow Logs)
    "sts",          # IRSA token exchange
  ]
}

resource "aws_vpc_endpoint" "interface" {
  for_each = toset(local.interface_endpoints)

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.${each.key}"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = { Name = "${var.name_prefix}-vpce-${each.key}" }
}

# S3 Gateway Endpoint — ECR uses S3 for image layer storage.
# Gateway Endpoints are free and use route table entries instead of ENIs.
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = aws_route_table.private[*].id

  tags = { Name = "${var.name_prefix}-vpce-s3" }
}

# ── VPC Flow Logs ─────────────────────────────────────────────────────────────
#tfsec:ignore:aws-cloudwatch-log-group-customer-key -- CMK encryption for flow logs is a cost/complexity tradeoff; acceptable for PoC
resource "aws_cloudwatch_log_group" "flow_logs" {
  name              = "/aws/vpc/${var.name_prefix}/flow-logs"
  retention_in_days = 30

  tags = { Name = "${var.name_prefix}-flow-logs" }
}

resource "aws_iam_role" "flow_logs" {
  name = "${var.name_prefix}-vpc-flow-logs-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "vpc-flow-logs.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

#tfsec:ignore:aws-iam-no-policy-wildcards -- resources are scoped to the specific flow log group ARN; tfsec false-positive on logs:CreateLogGroup action name
resource "aws_iam_role_policy" "flow_logs" {
  name = "${var.name_prefix}-vpc-flow-logs-policy"
  role = aws_iam_role.flow_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ]
      Resource = [
        aws_cloudwatch_log_group.flow_logs.arn,
        "${aws_cloudwatch_log_group.flow_logs.arn}:*"
      ]
    }]
  })
}

resource "aws_flow_log" "main" {
  iam_role_arn    = aws_iam_role.flow_logs.arn
  log_destination = aws_cloudwatch_log_group.flow_logs.arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.main.id

  tags = { Name = "${var.name_prefix}-flow-log" }
}
