#!/bin/bash
set -e

# Color variables
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Fixing Lambda Layer and Lambda Function dependencies...${NC}"

# Function to create or update requirements.txt files
create_or_update_requirements() {
  local dir=$1
  local req_file="${dir}/requirements.txt"
  local req_content=$2

  # Create directory if it doesn't exist
  mkdir -p "$dir"

  # Check if requirements.txt file exists
  if [ ! -f "$req_file" ]; then
    echo -e "${YELLOW}requirements.txt not found in ${dir}, creating it...${NC}"
    echo -e "$req_content" > "$req_file"
    echo -e "${GREEN}Created requirements.txt in ${dir}${NC}"
  else
    echo -e "${GREEN}requirements.txt exists in ${dir}${NC}"
    # Make sure requirements.txt is not empty
    if [ ! -s "$req_file" ]; then
      echo -e "${YELLOW}requirements.txt in ${dir} is empty, updating it...${NC}"
      echo -e "$req_content" > "$req_file"
      echo -e "${GREEN}Updated requirements.txt in ${dir}${NC}"
    fi
  fi

  # Copy requirements.txt to the right locations
  echo -e "${YELLOW}Copying requirements.txt within ${dir}...${NC}"
  
  # Create a directory in cdk.out for each lambda/layer
  local out_dir="cdk.out/$(echo ${dir} | sed 's/\//-/g')"
  mkdir -p "$out_dir"
  cp "$req_file" "$out_dir/"
  
  echo -e "${GREEN}Copied requirements.txt from ${dir}${NC}"
}

# 1. Fix OpenSearch Lambda Layer dependencies
OSS_LAYER_DIR="lib/knowledge-base-news-stack/lambda_layer"
OSS_LAYER_DEPS="aws-lambda-powertools~=2.32.0
requests-aws4auth~=1.2.3
opensearch-py~=2.4.2"

create_or_update_requirements "$OSS_LAYER_DIR" "$OSS_LAYER_DEPS"

# 2. Fix Blockchain Data Lambda dependencies
BLOCKCHAIN_LAMBDA_DIR="lib/knowledge-base-blockchain-data-stack/lambda/bedrock-agent-txtsql-action"
BLOCKCHAIN_LAMBDA_DEPS="aws-lambda-powertools>=2.32.0
boto3>=1.34.0
requests>=2.31.0
pandas>=2.1.4
pyarrow>=15.0.0
numpy>=1.26.0"

create_or_update_requirements "$BLOCKCHAIN_LAMBDA_DIR" "$BLOCKCHAIN_LAMBDA_DEPS"

# 3. Fix Supervisor Lambda dependencies
SUPERVISOR_LAMBDA_DIR="lib/crypto-ai-agent-supervisor-stack/lambda"
SUPERVISOR_LAMBDA_DEPS="aws-lambda-powertools>=2.32.0
requests>=2.32.0
boto3>=1.36.15
web3>=7.8.0
eth-account>=0.13.5
cryptography>=44.0.1
eth-keys>=0.5.0
pyasn1>=0.5.1
asn1tools>=0.166.0"

create_or_update_requirements "$SUPERVISOR_LAMBDA_DIR" "$SUPERVISOR_LAMBDA_DEPS"

# Create a root level requirements.txt for the OpenSearch custom resource
echo -e "${YELLOW}Creating root level requirements.txt for OpenSearch custom resource...${NC}"
cat > requirements.txt << EOL
boto3>=1.34.0
requests>=2.31.0
pytest>=7.4.0
poetry>=2.0.0
EOL

# Make sure the cdk.out directory exists
mkdir -p cdk.out

echo -e "${GREEN}All Lambda dependencies fixed!${NC}"
echo -e "${YELLOW}You can now run 'cdk deploy --all --require-approval never' again${NC}" 