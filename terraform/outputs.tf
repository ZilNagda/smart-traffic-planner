output "public_ip" {
  description = "Public IP of the Ubuntu server"
  value       = aws_instance.web.public_ip
}

output "website_url" {
  description = "URL of the website (after the container is running)"
  value       = "http://${aws_instance.web.public_ip}"
}

output "ecr_repository_url" {
  description = "ECR repository URL to push the Docker image to"
  value       = aws_ecr_repository.app.repository_url
}

output "ssh_command" {
  description = "Command to connect to the server"
  value       = "ssh -i YOUR_KEY.pem ubuntu@${aws_instance.web.public_ip}"
}
