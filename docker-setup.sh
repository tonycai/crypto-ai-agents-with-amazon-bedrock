#!/bin/bash
set -e

# Color variables
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Crypto AI Agents with Amazon Bedrock - Docker Setup${NC}"
echo -e "${YELLOW}=====================================================${NC}"

# Make sure all scripts are executable
chmod +x *.sh 2>/dev/null || true

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}No .env file found. Creating from sample...${NC}"
    if [ -f .env.sample ]; then
        cp .env.sample .env
        echo -e "${YELLOW}Please edit the .env file with your AWS account details before continuing.${NC}"
        exit 1
    else
        echo -e "${RED}No .env.sample file found. Creating a basic .env file...${NC}"
        cat > .env << EOL
# Required
ACCOUNT_ID=
# Optional
COINGECKO_API_KEY=
BLOCKCHAIN_RPC_URL=
UNSTOPPABLE_DOMAINS_ADDRESS=
EOL
        echo -e "${RED}Please edit the .env file with your AWS account details before continuing.${NC}"
        exit 1
    fi
fi

# Check if ACCOUNT_ID is set in .env
if ! grep -q "ACCOUNT_ID=" .env || grep -q "ACCOUNT_ID=$" .env; then
    echo -e "${RED}ACCOUNT_ID is not set in .env file. Please update it before continuing.${NC}"
    exit 1
fi

echo -e "${GREEN}Building and starting Docker container...${NC}"
docker-compose up -d --build

echo -e "${GREEN}Container is now running!${NC}"
echo -e "${YELLOW}To access the container, run:${NC}"
echo -e "    docker-compose exec crypto-ai-agent bash"
echo -e "${YELLOW}Then deploy the application:${NC}"
echo -e "    1. cdk bootstrap aws://\${CDK_DEPLOY_ACCOUNT}/\${CDK_DEPLOY_REGION}"
echo -e "    2. cdk deploy --all --require-approval never"

echo -e "${GREEN}Follow the steps in DOCKER_README.md to complete the setup.${NC}" 