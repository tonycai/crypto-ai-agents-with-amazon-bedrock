# Crypto AI Agents - Deployment Troubleshooting Guide

This document provides solutions for common deployment issues with the Crypto AI Agents project.

## Python Dependency Issues

### Missing requirements.txt File

**Problem**: When running `cdk deploy`, you might encounter an error like:
```
ERROR: Could not open requirements file: [Errno 2] No such file or directory: 'requirements.txt'
```

**Solution**: Run the provided fix-lambda-layers.sh script:
```bash
chmod +x fix-lambda-layers.sh
./fix-lambda-layers.sh
```

This script creates and updates requirements.txt files in all Lambda function and layer directories.

### Poetry Installation Timeout

**Problem**: When building Lambda functions, you might see timeout errors when installing Poetry:
```
ERROR: Exception:
Traceback (most recent call last):
...
ReadTimeoutError: HTTPSConnectionPool(host='files.pythonhosted.org', port=443): Read timed out.
```

**Solution**: Use the provided deployment script which includes retry logic and timeout extensions:
```bash
chmod +x deploy.sh
./deploy.sh
```

## Docker-related Issues

### Docker Not Running

**Problem**: If Docker isn't running, you'll see an error like:
```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?
```

**Solution**: Start Docker Desktop or the Docker service on your machine.

### Docker Network Issues

**Problem**: Sometimes Docker containers might have network connectivity issues when pulling packages.

**Solution**: Use the provided Dockerfile.opensearch-serverless which includes pre-installed packages and retry logic:
```bash
docker build -t opensearch-serverless-deploy -f Dockerfile.opensearch-serverless .
```

## CDK Deployment Issues

### CDK Synth Errors

**Problem**: CDK synth might fail due to missing dependencies or configuration issues.

**Solution**: Ensure you have properly configured your .env file:
```bash
cp .env.sample .env
# Edit the .env file with your account details
```

### Regional Deployment Issues

**Problem**: Some resources may not be available in all AWS regions.

**Solution**: Make sure you're deploying to a region that supports Amazon Bedrock services. The recommended region is `us-east-1`.

## Comprehensive Fix

For a one-stop solution to common deployment issues, use our deployment script:

```bash
chmod +x deploy.sh
./deploy.sh
```

This script:
1. Checks if Docker is running
2. Verifies AWS credentials
3. Fixes requirements.txt files
4. Builds necessary Docker images
5. Sets appropriate timeouts
6. Deploys CDK stacks with retry logic

## After Successful Deployment

After deployment, follow these steps:
1. Enable Bedrock Model Access for Amazon Nova Pro v1 and Amazon Titan
2. Orchestrate the two agents
3. Sync the Knowledge Base

See the main README.md for detailed instructions on these post-deployment steps. 