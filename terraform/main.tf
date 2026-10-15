terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Latest Ubuntu 22.04 LTS AMI published by Canonical (public SSM parameter)
data "aws_ssm_parameter" "ubuntu" {
  name = "/aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp2/ami-id"
}

data "aws_vpc" "default" {
  default = true
}

# ---------------------------------------------------------------- ECR
resource "aws_ecr_repository" "app" {
  name                 = var.project_name
  image_tag_mutability = "MUTABLE"
  force_delete         = true # lets `terraform destroy` remove the repo even if it contains images

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Project = var.project_name
  }
}

# ---------------------------------------------------------------- IAM: EC2 can pull from ECR
resource "aws_iam_role" "ec2_ecr" {
  name = "${var.project_name}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecr_read" {
  role       = aws_iam_role.ec2_ecr.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.project_name}-ec2-profile"
  role = aws_iam_role.ec2_ecr.name
}

# ---------------------------------------------------------------- Network
resource "aws_security_group" "web" {
  name        = "${var.project_name}-sg"
  description = "Allow HTTP to the website; SSH only from the allowed CIDR"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTP from anywhere (public website)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH (restricted to your IP)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  egress {
    description = "Outbound traffic (package installs, ECR pulls)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project_name}-sg"
    Project = var.project_name
  }
}

# ---------------------------------------------------------------- EC2 (Ubuntu + Docker CLI)
resource "aws_instance" "web" {
  ami                         = data.aws_ssm_parameter.ubuntu.value
  instance_type               = var.instance_type
  key_name                    = var.key_name
  vpc_security_group_ids      = [aws_security_group.web.id]
  iam_instance_profile        = aws_iam_instance_profile.ec2.name
  associate_public_ip_address = true

  user_data = <<-EOT
    #!/bin/bash
    set -e
    apt-get update -y
    apt-get install -y docker.io awscli
    systemctl enable --now docker
    usermod -aG docker ubuntu
  EOT

  user_data_replace_on_change = true

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required" # IMDSv2 only
  }

  root_block_device {
    volume_type = "gp3"
    volume_size = 12
    encrypted   = true
  }

  tags = {
    Name    = "${var.project_name}-ubuntu"
    Project = var.project_name
  }
}
