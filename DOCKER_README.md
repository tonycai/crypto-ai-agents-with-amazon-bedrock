# Running Crypto AI Agents with Docker

This guide explains how to run the Crypto AI Agents project using Docker containers.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- AWS credentials configured

## Setup

1. Clone this repository and navigate to the project directory:
```bash
git clone git@github.com:aws-samples/crypto-ai-agents-with-amazon-bedrock.git
cd crypto-ai-agents-with-amazon-bedrock
```

2. Use the provided setup script to create and configure your environment:
```bash
./docker-setup.sh
```

3. Edit the `.env` file and add your AWS account details:
```
# Required
ACCOUNT_ID=<your-aws-account-id>

# Optional
COINGECKO_API_KEY=<your-coingecko-api-key>
BLOCKCHAIN_RPC_URL=<your-blockchain-rpc-url>
UNSTOPPABLE_DOMAINS_ADDRESS=<your-unstoppable-domains-address>
```

4. Run the setup script again to build and start the container:
```bash
./docker-setup.sh
```

## Running with Docker Compose

1. If you prefer not to use the setup script, you can manually build and start the container:
```bash
docker-compose up -d
```

2. Access the running container:
```bash
docker-compose exec crypto-ai-agent bash
```

3. Once inside the container, deploy the application:
```bash
# Bootstrap CDK (only needed once per account/region)
cdk bootstrap aws://${CDK_DEPLOY_ACCOUNT}/${CDK_DEPLOY_REGION}

# Deploy all stacks
cdk deploy --all --require-approval never
```

4. Follow the steps in the main README.md to complete the setup:
   - Enable Bedrock Model Access for Amazon Nova Pro v1 and Amazon Titan
   - Orchestrate the two agents
   - Sync the Knowledge Base

## Stopping the Container

To stop the container, you can use the cleanup script:
```bash
./docker-cleanup.sh
```

Or manually:
```bash
docker-compose down
```

## Troubleshooting

If you encounter issues with Python dependencies:
1. Make sure Docker has enough resources allocated (memory/CPU)
2. Check that Python 3.12 is correctly installed in the container:
```bash
docker-compose exec crypto-ai-agent python3 --version
```
3. Verify AWS credentials are correctly mounted:
```bash
docker-compose exec crypto-ai-agent aws sts get-caller-identity
```

For AWS credential issues, ensure your `~/.aws` directory contains valid credentials and is correctly mounted to the container.

## Docker Environment Variables

The following environment variables can be set in your `.env` file or exported in your shell before running Docker Compose:

| Variable | Description | Default |
|----------|-------------|---------|
| AWS_REGION | AWS region for deployment | us-east-1 |
| CDK_DEPLOY_REGION | Region for CDK deployment | Same as AWS_REGION |
| CDK_DEPLOY_ACCOUNT | AWS account ID for deployment | From ACCOUNT_ID in .env |
| ACCOUNT_ID | Your AWS account ID (required) | - |
| COINGECKO_API_KEY | API key for CoinGecko (optional) | - |
| BLOCKCHAIN_RPC_URL | Custom blockchain RPC URL (optional) | - |
| UNSTOPPABLE_DOMAINS_ADDRESS | Unstoppable Domains contract address (optional) | - | 