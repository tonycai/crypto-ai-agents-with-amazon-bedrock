// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { bedrock as bedrockGenAIConstructs } from '@cdklabs/generative-ai-cdk-constructs';
import { getConfig, EnvironmentConfig } from '../../utils/environment';

const config: EnvironmentConfig = getConfig();

// Environment variables
const bucket = config.bucketName;

if (!bucket) {
  throw new Error('S3_BUCKET_NAME environment variable is required');
}

export class KbInfraStack extends cdk.Stack {
  private kbRoleArn: string;
  private collectionArn: string;
  public readonly knowledgeBase: bedrockGenAIConstructs.VectorKnowledgeBase;
  
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.kbRoleArn = ssm.StringParameter.fromStringParameterAttributes(this, 'kbRoleArn', {
      parameterName: '/e2e-rag/kbRoleArn',
    }).stringValue;

    this.collectionArn = ssm.StringParameter.fromStringParameterAttributes(this, 'collectionArn', {
      parameterName: '/e2e-rag/collectionArn',
    }).stringValue;

    this.knowledgeBase = this.createKnowledgeBase();
  }

  private createKnowledgeBase(): bedrockGenAIConstructs.VectorKnowledgeBase {

    const kb = new bedrockGenAIConstructs.VectorKnowledgeBase(this, 'e2eRagKB', {
        embeddingsModel: bedrockGenAIConstructs.BedrockFoundationModel.TITAN_EMBED_TEXT_V1,
        instruction: 'Use this knowledge base to obtain current news about blockchain'
    });

    kb.addWebCrawlerDataSource({
        sourceUrls: ['https://www.theblockbeats.info/'],
        chunkingStrategy: bedrockGenAIConstructs.ChunkingStrategy.HIERARCHICAL_COHERE,
    });

    return kb;
  }
}