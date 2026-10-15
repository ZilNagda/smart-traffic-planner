variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "Name prefix for resources (also the ECR repository name)"
  type        = string
  default     = "smart-traffic-planner"
}

variable "instance_type" {
  description = "EC2 instance type (choose a free-tier eligible type for your account)"
  type        = string
  default     = "t3.micro"
}

variable "key_name" {
  description = "Name of an existing EC2 key pair, used for SSH"
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "CIDR allowed to SSH, for example 203.0.113.10/32. Use your own IP, not 0.0.0.0/0."
  type        = string
}
