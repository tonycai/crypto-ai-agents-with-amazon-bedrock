export function getRequiredEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Required environment variable ${name} is not set`);
    }
    return value;
}

export interface EnvironmentConfig {
    region: string;
    accountId: string;
    kbRoleName: string;
    collectionName: string;
    indexName: string;
    embeddingModelId: string;
    bucketName: string;
    maxTokens: number;
    chunkingStrategy: string;
    overlapPercentage: number;
    coinGeckoAPIKey: string;
    blockchainRPCURL: string | null;
}

export function getConfig(): EnvironmentConfig {
    return {
      region: getRequiredEnvVar('AWS_REGION'),
      accountId: getRequiredEnvVar('ACCOUNT_ID'),
      kbRoleName: getRequiredEnvVar('KB_ROLE_NAME'),
      collectionName: getRequiredEnvVar('COLLECTION_NAME'),
      indexName: getRequiredEnvVar('INDEX_NAME'),
      embeddingModelId: getRequiredEnvVar('EMBEDDING_MODEL_ID'),
      bucketName: getRequiredEnvVar('BUCKET_NAME'),
      maxTokens: parseInt(getRequiredEnvVar('MAX_TOKENS') || '300', 10),
      chunkingStrategy: getRequiredEnvVar('CHUNKING_STRATEGY'),
      overlapPercentage:  parseInt(getRequiredEnvVar('OVERLAP_PERCENTAGE') || '20', 10),
      coinGeckoAPIKey: getRequiredEnvVar('COINGECKO_API_KEY'),
      blockchainRPCURL: process.env.BLOCKCHAIN_RPC_URL || null
    };
}
