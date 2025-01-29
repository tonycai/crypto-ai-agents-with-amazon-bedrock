#!/usr/bin/env node
import * as dotenv from 'dotenv';
dotenv.config();

import * as cdk from 'aws-cdk-lib';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { CryptoAIAgentSupervisorStack } from '../lib/crypto-ai-agent-supervisor-stack';
import { KbRoleStack } from '../lib/knowledge-base-news-stack/kb-role-stack';
import { OpenSearchServerlessInfraStack } from '../lib/knowledge-base-news-stack/oss-infra-stack';
import { KbInfraStack } from '../lib/knowledge-base-news-stack/kb-infra-stack';
import { KbBlockchainDataStack } from '../lib/knowledge-base-blockchain-data-stack';

const app = new cdk.App();

// ### Create KnowledgeBase to ingest blockchain news
// Borrows from https://github.com/aws-samples/amazon-bedrock-samples/tree/main/rag/knowledge-bases/features-examples/04-infrastructure/e2e_rag_using_bedrock_kb_cdk
// Create IAM role for e2e RAG
const kbRoleStack = new KbRoleStack(app, 'KbRoleStack');

// Setup OSS
const openSearchServerlessInfraStack = new OpenSearchServerlessInfraStack(app, 'OpenSearchServerlessInfraStack');
openSearchServerlessInfraStack.node.addDependency(kbRoleStack);
// Create Knowledgebase and datasource
const kbInfraStack = new KbInfraStack(app, 'KbInfraStack');
kbInfraStack.node.addDependency(openSearchServerlessInfraStack);

// ### Create KnowledgeBase to ingest blockchain data
const kbBlockchainDataStack = new KbBlockchainDataStack(app, 'BlockchainDataAgentStack');
kbBlockchainDataStack.node.addDependency(kbInfraStack);

// ### Create AI Agent
const cryptoAIAgentSupervisorStack = new CryptoAIAgentSupervisorStack(app, 'CryptoAIAgentSupervisorStack', 
  { knowledgeBase: kbInfraStack.knowledgeBase }
);
cryptoAIAgentSupervisorStack.node.addDependency(kbBlockchainDataStack);

// cdk.Aspects.of(app).add(new AwsSolutionsChecks())

// NagSuppressions.addStackSuppressions(cryptoAIAgentSupervisorStack, [
//   { id: 'AwsSolutions-IAM4', reason: 'AWSLambdaBasicExecutionRole, AWSLambdaVPCAccessExecutionRole are restrictive roles' },
//   { id: 'AwsSolutions-IAM5', reason: 'Permission to read CF stack is restrictive enough' },
// ], true);