import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as opensearchserverless from 'aws-cdk-lib/aws-opensearchserverless';
import { getConfig, EnvironmentConfig } from '../../utils/environment';

// Enums instead of Python classes
enum SecurityPolicyType {
  ENCRYPTION = 'encryption',
  NETWORK = 'network'
}

enum StandByReplicas {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED'
}

enum CollectionType {
  VECTORSEARCH = 'VECTORSEARCH',
  SEARCH = 'SEARCH',
  TIMESERIES = 'TIMESERIES'
}

enum AccessPolicyType {
  DATA = 'data'
}

const config: EnvironmentConfig = getConfig();

// Configuration from environment variables
const region = config.region;
const accountId = config.accountId;
const kbRoleName = config.kbRoleName;
const collectionName = config.collectionName;
const indexName = config.indexName;
const embeddingModelId = config.embeddingModelId;
import * as path from 'path';

export class OpenSearchServerlessInfraStack extends cdk.Stack {
  private encryptionPolicy: opensearchserverless.CfnSecurityPolicy;
  private networkPolicy: opensearchserverless.CfnSecurityPolicy;
  private dataAccessPolicy: opensearchserverless.CfnAccessPolicy;
  private collection: opensearchserverless.CfnCollection;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.encryptionPolicy = this.createEncryptionPolicy();
    this.networkPolicy = this.createNetworkPolicy();
    this.dataAccessPolicy = this.createDataAccessPolicy();
    this.collection = this.createCollection();

    // Dependencies
    this.networkPolicy.node.addDependency(this.encryptionPolicy);
    this.dataAccessPolicy.node.addDependency(this.networkPolicy);
    this.collection.node.addDependency(this.encryptionPolicy);

    // SSM Parameter
    new ssm.StringParameter(this, 'collectionArn', {
      parameterName: '/e2e-rag/collectionArn',
      stringValue: this.collection.attrArn
    });

    this.createOssIndex();
  }

  private createEncryptionPolicy(): opensearchserverless.CfnSecurityPolicy {
    return new opensearchserverless.CfnSecurityPolicy(this, 'EncryptionPolicy', {
      name: `${collectionName}-enc`,
      type: SecurityPolicyType.ENCRYPTION,
      policy: JSON.stringify({
        Rules: [{ ResourceType: 'collection', Resource: [`collection/${collectionName}`] }],
        AWSOwnedKey: true
      })
    });
  }

  private createNetworkPolicy(): opensearchserverless.CfnSecurityPolicy {
    return new opensearchserverless.CfnSecurityPolicy(this, 'NetworkPolicy', {
      name: `${collectionName}-net`,
      type: SecurityPolicyType.NETWORK,
      policy: JSON.stringify([{
        Description: 'Public access for ct-kb-aoss-collection collection',
        Rules: [
          { ResourceType: 'dashboard', Resource: [`collection/${collectionName}`] },
          { ResourceType: 'collection', Resource: [`collection/${collectionName}`] }
        ],
        AllowFromPublic: true
      }])
    });
  }

  private createCollection(): opensearchserverless.CfnCollection {
    return new opensearchserverless.CfnCollection(this, 'Collection', {
      name: collectionName,
      description: `${collectionName}-e2eRAG-collection`,
      type: CollectionType.VECTORSEARCH
    });
  }

  private createDataAccessPolicy(): opensearchserverless.CfnAccessPolicy {
    const kbRoleArn = ssm.StringParameter.fromStringParameterAttributes(this, 'kbRoleArn', {
      parameterName: '/e2e-rag/kbRoleArn'
    }).stringValue;

    return new opensearchserverless.CfnAccessPolicy(this, 'DataAccessPolicy', {
      name: `${collectionName}-access`,
      type: AccessPolicyType.DATA,
      policy: JSON.stringify([{
        Rules: [
          {
            Resource: [`collection/${collectionName}`],
            Permission: [
              'aoss:CreateCollectionItems',
              'aoss:UpdateCollectionItems',
              'aoss:DescribeCollectionItems'
            ],
            ResourceType: 'collection'
          },
          {
            ResourceType: 'index',
            Resource: [`index/${collectionName}/*`],
            Permission: [
              'aoss:CreateIndex',
              'aoss:DescribeIndex',
              'aoss:ReadDocument',
              'aoss:WriteDocument',
              'aoss:UpdateIndex',
              'aoss:DeleteIndex'
            ]
          }
        ],
        Principal: [kbRoleArn]
      }])
    });
  }

  private createOssIndex(): void {
    // Dependency Layer
    const dependencyLayer = new lambda.LayerVersion(this, 'DependenciesLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda_layer'), {
        bundling: {
          image: lambda.Runtime.PYTHON_3_9.bundlingImage,
          command: [
            'bash', '-c',
            'pip install -r requirements.txt -t /asset-output/python'
          ],
        },
      }),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_9, lambda.Runtime.PYTHON_3_10],
      license: 'Apache-2.0',
      description: 'dependency_layer including requests, requests-aws4auth, aws-lambda-powertools, opensearch-py'
    });


    // Lambda Role
    const ossLambdaRole = new iam.Role(this, 'OSSLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    });

    ossLambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'aoss:APIAccessAll',
        'aoss:List*',
        'aoss:Get*',
        'aoss:Create*',
        'aoss:Update*',
        'aoss:Delete*'
      ],
      resources: ['*']
    }));

    // Lambda Function
    const ossIndexCreationLambda = new lambda.Function(this, 'BKB-OSS-InfraSetupLambda', {
      functionName: `BKB-OSS-${indexName}-InfraSetupLambda`,
      // code: lambda.Code.fromAsset('src/amazon_bedrock_knowledge_base_infra_setup_lambda'),
      code: lambda.Code.fromAsset(path.join(__dirname, 'src/amazon_bedrock_knowledge_base_infra_setup_lambda')),
      handler: 'oss_handler.lambda_handler',
      role: ossLambdaRole,
      memorySize: 1024,
      timeout: cdk.Duration.minutes(14),
      runtime: lambda.Runtime.PYTHON_3_10,
      tracing: lambda.Tracing.ACTIVE,
      currentVersionOptions: { removalPolicy: cdk.RemovalPolicy.DESTROY },
      layers: [dependencyLayer],
      environment: {
        POWERTOOLS_SERVICE_NAME: 'InfraSetupLambda',
        POWERTOOLS_METRICS_NAMESPACE: 'InfraSetupLambda-NameSpace',
        POWERTOOLS_LOG_LEVEL: 'INFO'
      }
    });

    // Custom Resource Provider
    const ossProviderRole = new iam.Role(this, 'OSSProviderRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    });

    ossProviderRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'aoss:APIAccessAll',
        'aoss:List*',
        'aoss:Get*',
        'aoss:Create*',
        'aoss:Update*',
        'aoss:Delete*'
      ],
      resources: ['*']
    }));

    const ossIndexCreationProvider = new cr.Provider(this, 'OSSProvider', {
      onEventHandler: ossIndexCreationLambda,
      logGroup: new logs.LogGroup(this, 'OSSIndexCreationProviderLogs', {
        retention: logs.RetentionDays.ONE_DAY
      }),
      role: ossProviderRole
    });

    // Custom Resource
    const indexCreationCustomResource = new cdk.CustomResource(this, 'OSSIndexCreationCustomResource', {
      serviceToken: ossIndexCreationProvider.serviceToken,
      properties: {
        collection_endpoint: this.collection.attrCollectionEndpoint,
        data_access_policy_name: this.dataAccessPolicy.name,
        index_name: indexName,
        embedding_model_id: embeddingModelId
      }
    });

    indexCreationCustomResource.node.addDependency(ossIndexCreationProvider);
  }
}