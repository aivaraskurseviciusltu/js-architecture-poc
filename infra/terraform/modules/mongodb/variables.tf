variable "name_prefix" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "eks_node_sg_id" { type = string }
variable "instance_class" { type = string }
variable "instance_count" { type = number }
variable "master_username" {
  type      = string
  sensitive = true
}
variable "master_password" {
  type      = string
  sensitive = true
}
variable "environment" { type = string }
