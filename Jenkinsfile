pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
    }

    parameters {
        booleanParam(name: 'FAIL_ON_CRITICAL', defaultValue: false,
                     description: 'Fail the build if Trivy finds CRITICAL vulnerabilities in the Docker image')
        booleanParam(name: 'DEPLOY_TO_EC2', defaultValue: true,
                     description: 'Deploy the image from ECR to the Ubuntu EC2 instance')
    }

    environment {
        // TODO: replace these three values before running
        AWS_ACCOUNT_ID = '904854373740'
        AWS_REGION     = 'ap-southeast-2'
        EC2_HOST       = '15.135.75.158'

        ECR_REGISTRY   = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        IMAGE_NAME     = "${ECR_REGISTRY}/smart-traffic-planner"
        IMAGE_TAG      = "${env.BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Unit Tests') {
            steps {
                sh 'node --version'
                sh 'node --test tests/*.test.js'
            }
        }

        stage('SonarQube Analysis (SAST)') {
            environment {
                scannerHome = tool 'SonarScanner'
            }
            steps {
                withSonarQubeEnv('sonarqube') {
                    sh "${scannerHome}/bin/sonar-scanner"
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Trivy: Source, Dependencies and Terraform') {
            steps {
                sh 'mkdir -p reports'
                sh 'trivy fs --scanners vuln,secret --severity LOW,MEDIUM,HIGH,CRITICAL --format table --output reports/trivy-fs.txt .'
                sh 'trivy config --severity LOW,MEDIUM,HIGH,CRITICAL --format table --output reports/trivy-terraform.txt terraform/'
            }
        }

        stage('Docker Build') {
            steps {
                sh 'docker build -t ${IMAGE_NAME}:${IMAGE_TAG} -t ${IMAGE_NAME}:latest .'
            }
        }

        stage('Trivy: Docker Image') {
            steps {
                sh 'trivy image --severity LOW,MEDIUM,HIGH,CRITICAL --format table --output reports/trivy-image.txt ${IMAGE_NAME}:${IMAGE_TAG}'
                script {
                    if (params.FAIL_ON_CRITICAL) {
                        sh 'trivy image --severity CRITICAL --exit-code 1 --no-progress ${IMAGE_NAME}:${IMAGE_TAG}'
                    }
                }
            }
        }

        stage('Push Image to ECR') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'aws-creds',
                                                  usernameVariable: 'AWS_ACCESS_KEY_ID',
                                                  passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                    sh 'aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}'
                    sh 'docker push ${IMAGE_NAME}:${IMAGE_TAG}'
                    sh 'docker push ${IMAGE_NAME}:latest'
                }
            }
        }

        stage('Deploy to Ubuntu EC2') {
            when { expression { params.DEPLOY_TO_EC2 } }
            steps {
                sshagent(credentials: ['ec2-ssh-key']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=accept-new ubuntu@${EC2_HOST} "
                            aws ecr get-login-password --region ${AWS_REGION} | sudo docker login --username AWS --password-stdin ${ECR_REGISTRY} &&
                            sudo docker pull ${IMAGE_NAME}:${IMAGE_TAG} &&
                            (sudo docker rm -f planner || true) &&
                            sudo docker run -d --name planner --restart unless-stopped -p 80:8080 ${IMAGE_NAME}:${IMAGE_TAG}
                        "
                    '''
                }
            }
        }

        stage('Smoke Test') {
            when { expression { params.DEPLOY_TO_EC2 } }
            steps {
                sh 'sleep 5 && curl -fsS http://${EC2_HOST}/healthz'
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'reports/**', allowEmptyArchive: true
            sh 'docker logout ${ECR_REGISTRY} || true'
        }
        success { echo 'Pipeline finished successfully.' }
        failure { echo 'Pipeline failed. Check the stage logs above.' }
    }
}
