# Runbook: follow your faculty's steps in order

Take a screenshot (SS) where marked. Hide passwords, access keys and tokens in every screenshot and in the video.

## Step 1. Put the project on GitHub  (SS: repo page, commit history)
```bash
git init
git add .
git commit -m "Initial commit: PERT planner website with tests"
git branch -M main
git remote add origin https://github.com/YOUR_USER/smart-traffic-planner.git
git push -u origin main
```
Make a few more small commits as you finish later steps.

## Step 2. Dockerize the project  (SS: docker build, docker ps, site at localhost:8080)
```bash
npm test
docker build -t smart-traffic-planner .
docker run -d --name planner -p 8080:8080 smart-traffic-planner
curl http://localhost:8080/healthz
```

## Step 3. Trivy image scan with report  (SS: scan output)
```bash
mkdir reports
trivy image --severity LOW,MEDIUM,HIGH,CRITICAL --format table --output reports/trivy-image.txt smart-traffic-planner
trivy image smart-traffic-planner          # also show it on screen for the screenshot
trivy fs --scanners vuln,secret .          # dependencies / source
```
Fill `docs/vulnerability-report-template.md` from the real output.

## Step 4. SonarQube code scan (SAST) with report  (SS: dashboard, issues, quality gate)
```bash
docker compose -f docker-compose.tools.yml up -d      # open http://localhost:9000, login admin/admin and change the password
```
1. Create a project with key `smart-traffic-planner`, choose "Locally", generate a token.
2. Run the scanner (needs sonar-scanner installed, or use the Docker version):
```bash
docker run --rm --network host -e SONAR_HOST_URL=http://localhost:9000 -e SONAR_TOKEN=YOUR_TOKEN -v "%cd%:/usr/src" sonarsource/sonar-scanner-cli
```
(on Mac/Linux use `-v "$(pwd):/usr/src"`). Screenshot the project dashboard and the issues list.

## Step 5. Create AWS Ubuntu EC2 + ECR with Terraform  (SS: plan, apply, outputs, EC2 console, ECR console)
Before you start:
- Set an **AWS billing alert**.
- EC2 console > Key pairs > Create key pair (download the .pem and keep it out of Git).
- Create an IAM user for CLI use and run `aws configure` (never use the root account). Lab accounts: if your college uses AWS Academy / Learner Lab, tell your faculty or me, because IAM role creation is restricted there and the Terraform needs a small change.

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars      # edit: key_name, allowed_ssh_cidr = YOUR_IP/32
terraform init
terraform fmt
terraform validate
terraform plan
terraform apply
```
Note the outputs: `public_ip`, `ecr_repository_url`, `ssh_command`. The instance installs **Docker CLI and AWS CLI** on first boot (wait about 2 minutes).
Check it: `ssh -i YOUR_KEY.pem ubuntu@PUBLIC_IP` then `docker --version` (SS).

## Step 6. Push the image to ECR  (SS: ECR console showing the image)
```bash
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com
docker tag smart-traffic-planner:latest ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/smart-traffic-planner:latest
docker push ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/smart-traffic-planner:latest
```

## Step 7. Run the ECR image with Docker CLI on the EC2 machine  (SS: docker ps on the server)
On the server (after `ssh`):
```bash
aws ecr get-login-password --region ap-south-1 | sudo docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com
sudo docker pull ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/smart-traffic-planner:latest
sudo docker run -d --name planner --restart unless-stopped -p 80:8080 ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/smart-traffic-planner:latest
sudo docker ps
```
The EC2 role (created by Terraform) lets the server pull from ECR without access keys.

## Step 8. Show the application on the public IP  (SS: browser at http://PUBLIC_IP)
Open `http://PUBLIC_IP` (port 80). The website listens inside the container on 8080 and Docker maps port 80 to it. Screenshot the browser with the IP visible.

## Step 9. Integrate everything in Jenkins CI/CD  (SS: stage view all green, console output)
1. Install Jenkins (laptop or EC2). Plugins: Pipeline, Git, Docker Pipeline, SSH Agent, SonarQube Scanner, Credentials Binding. On the Jenkins machine install: Docker, Node, Trivy, AWS CLI.
2. Jenkins > Credentials:
   - `aws-creds`: Username with password. Username = IAM access key ID, password = secret key. Use an IAM user with only `AmazonEC2ContainerRegistryPowerUser`.
   - `ec2-ssh-key`: SSH username with private key, username `ubuntu`, paste the .pem contents.
3. Jenkins > System: add a SonarQube server named `sonarqube` (URL + token). Tools: add a SonarQube Scanner named `SonarScanner`. In SonarQube add the webhook `http://JENKINS_URL/sonarqube-webhook/`.
4. Edit the three TODO values in the `Jenkinsfile` (account ID, region, EC2 IP) and commit.
5. New Item > Pipeline > Pipeline script from SCM > your GitHub repo > `Jenkinsfile`. Click **Build with Parameters**.
6. Check the archived `reports/` files and the website on the public IP after the deploy stage.

## Step 10. Clean up after your demo
```bash
cd terraform && terraform destroy
```
This stops AWS charges. Also delete any IAM access keys you created for Jenkins.

## Common problems
- Quality Gate stage hangs: the SonarQube webhook is missing.
- `trivy: command not found` in Jenkins: install Trivy on the Jenkins machine.
- Docker permission denied in Jenkins: `sudo usermod -aG docker jenkins` and restart Jenkins.
- `aws: command not found` in Jenkins: install the AWS CLI on the Jenkins machine.
- Website does not open on the public IP: wait for the container to start, check `sudo docker ps`, and confirm the security group allows port 80.
- Instance type not free-tier eligible: change `instance_type` to `t2.micro`.
