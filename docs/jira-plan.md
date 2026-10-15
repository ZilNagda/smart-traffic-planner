# JIRA plan for the DevSecOps project

Create a new epic **DevSecOps Pipeline for Smart Traffic Planner** in the same JIRA space (or a new one), with these stories.

| # | Story | Acceptance criteria |
|---|---|---|
| 1 | Develop the planner website | Site shows table, results, Gantt and PERT; 11 unit tests pass |
| 2 | Set up GitHub repository and version control | Repo has source, Dockerfile, Jenkinsfile, Terraform; multiple commits |
| 3 | Containerize the website with Docker | Image builds; container serves site and `/healthz` returns ok |
| 4 | Provision AWS infrastructure with Terraform | `terraform apply` creates Ubuntu EC2 with Docker CLI, ECR repo and security group |
| 5 | Build the Jenkins CI/CD pipeline | Pipeline runs tests, scans, build, push and deploy |
| 6 | Add SonarQube code analysis | Analysis visible in SonarQube; quality gate result recorded |
| 7 | Add Trivy dependency, Terraform and image scans | Reports archived by Jenkins |
| 8 | Prepare vulnerability report | Findings, severity, threats, fixes and screenshots documented |
| 9 | Draw architecture and CI/CD diagrams | Two diagrams exported |
| 10 | Prepare report, PPT and demo video | All submission items ready |

Run it as two sprints: Sprint 1 (stories 1 to 4), Sprint 2 (stories 5 to 10). Move cards to Done only when the acceptance criteria are really met.
