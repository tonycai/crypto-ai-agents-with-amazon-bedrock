#!/bin/bash
set -e

# Color variables
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Crypto AI Agents with Amazon Bedrock - Deployment Script${NC}"
echo -e "${YELLOW}========================================================${NC}"

# Function to check if Docker is running
check_docker() {
  echo -e "${YELLOW}Checking if Docker is running...${NC}"
  if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Docker is not running. Please start Docker and try again.${NC}"
    exit 1
  fi
  echo -e "${GREEN}Docker is running.${NC}"
}

# Check if AWS credentials are configured
check_aws_creds() {
  echo -e "${YELLOW}Checking AWS credentials...${NC}"
  if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}AWS credentials not found or not properly configured.${NC}"
    echo -e "${YELLOW}Please configure your AWS credentials and try again:${NC}"
    echo "aws configure"
    exit 1
  fi
  echo -e "${GREEN}AWS credentials found.${NC}"
}

# Build custom Docker images for Lambda layers
build_docker_images() {
  echo -e "${YELLOW}Building custom Docker image for OpenSearch Serverless deployment...${NC}"
  docker build -t opensearch-serverless-deploy -f Dockerfile.opensearch-serverless .
  echo -e "${GREEN}Docker image built successfully.${NC}"
}

# Apply fixes for requirements.txt files
apply_requirements_fixes() {
  echo -e "${YELLOW}Applying fixes for Lambda requirements...${NC}"
  ./fix-lambda-layers.sh
  echo -e "${GREEN}Requirements fixes applied.${NC}"
}

# Run the CDK deployment with retries
deploy_with_retries() {
  MAX_RETRIES=3
  RETRY_COUNT=0
  
  while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    echo -e "${YELLOW}Deploying CDK stacks (Attempt $(($RETRY_COUNT + 1))/${MAX_RETRIES})...${NC}"
    
    if cdk deploy --all --require-approval never; then
      echo -e "${GREEN}Deployment successful!${NC}"
      return 0
    else
      RETRY_COUNT=$((RETRY_COUNT + 1))
      if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
        echo -e "${YELLOW}Deployment failed. Retrying in 10 seconds...${NC}"
        sleep 10
        
        # Reapply fixes before retrying
        apply_requirements_fixes
      else
        echo -e "${RED}Deployment failed after ${MAX_RETRIES} attempts.${NC}"
        return 1
      fi
    fi
  done
}

# Main execution
main() {
  # Perform checks
  check_docker
  check_aws_creds
  
  # Apply fixes
  apply_requirements_fixes
  
  # Build Docker images
  build_docker_images
  
  # Configure environment for Poetry
  echo -e "${YELLOW}Configuring Poetry settings...${NC}"
  export POETRY_HTTP_TIMEOUT=120
  
  # Deploy the CDK stacks
  deploy_with_retries
  
  # Provide instructions for next steps
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Deployment successful! Follow these next steps:${NC}"
    echo -e "${YELLOW}1. Enable Bedrock Model Access for Amazon Nova Pro v1 and Amazon Titan${NC}"
    echo -e "${YELLOW}2. Orchestrate the two agents${NC}"
    echo -e "${YELLOW}3. Sync the Knowledge Base${NC}"
    echo -e "${YELLOW}See README.md for detailed instructions on these steps.${NC}"
  fi
}

# Run the main function
main 