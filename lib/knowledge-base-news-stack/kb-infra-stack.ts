import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as s3 from 'aws-cdk-lib/aws-s3';
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
  public readonly knowledgeBase: bedrockGenAIConstructs.KnowledgeBase;
  
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

  private createKnowledgeBase(): bedrockGenAIConstructs.KnowledgeBase {

    const kb = new bedrockGenAIConstructs.KnowledgeBase(this, 'e2eRagKB', {
        embeddingsModel: bedrockGenAIConstructs.BedrockFoundationModel.TITAN_EMBED_TEXT_V1,
        instruction: 'Use this knowledge base to obtain historic and current news information about blockchain'
    });
    
    // Generate a unique bucket name
    // const bucketName = `blockchain-news-bucket-${cdk.Names.uniqueId(this)}`.toLowerCase();
    // const newsBucket = new s3.Bucket(this, bucketName);

    kb.addWebCrawlerDataSource({
        sourceUrls: ['https://www.theblockbeats.info/'],
        chunkingStrategy: bedrockGenAIConstructs.ChunkingStrategy.HIERARCHICAL_COHERE,
    });

    return kb;
  }
}