# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import os
from typing import Dict
from boto3 import client

KNOWLEDGE_BASE_ID = os.environ['KNOWLEDGE_BASE_ID']
DATA_SOURCE_ID = os.environ['DATA_SOURCE_ID']
AWS_REGION = os.environ['AWS_REGION']

bedrock_agent_client = client('bedrock-agent', region_name=AWS_REGION)

def lambda_handler(event, context):
    input_data = {
        'knowledgeBaseId': KNOWLEDGE_BASE_ID,
        'dataSourceId': DATA_SOURCE_ID,
        'clientToken': context.aws_request_id
    }
    
    response = bedrock_agent_client.start_ingestion_job(**input_data)
    print(response)
    
    return {
        'ingestionJob': response['ingestionJob']
    }

