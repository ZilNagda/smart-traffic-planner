# Smart Traffic PERT & Gantt Planner (DevSecOps Micro Project)

A web-based planner for the *Smart Traffic Management Application* project. Enter activities with
optimistic / most likely / pessimistic times and predecessors; the site calculates PERT values,
the critical path, slack and the probability of meeting a deadline, and draws Gantt and PERT charts.

SDG 9 (Industry, Innovation and Infrastructure) and SDG 11 (Sustainable Cities and Communities).

## Run locally
```bash
npm test                       # unit tests (Node 18+)
docker build -t smart-traffic-planner .
docker run -d -p 8080:8080 smart-traffic-planner
# open http://localhost:8080
```

## Repository layout
| Path | Purpose |
|---|---|
| `src/` | Website (HTML, CSS, JavaScript) |
| `tests/` | Unit tests for the PERT calculation logic |
| `Dockerfile`, `nginx.conf` | Non-root nginx container with security headers |
| `Jenkinsfile` | CI/CD: test, SonarQube, Trivy, build, push to ECR, deploy |
| `terraform/` | AWS infrastructure (Ubuntu EC2 with Docker CLI, ECR repository, IAM role, security group) |
| `sonar-project.properties` | SonarQube configuration |
| `docs/` | Runbook, JIRA plan, vulnerability report template |

## Security notes
No credentials are stored in this repository. Jenkins credentials, AWS keys and `terraform.tfvars`
are kept outside Git (see `.gitignore`).
