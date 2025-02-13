# Welcome to Crypto AI Agents on Amazon Bedrock

Note: this repo is still undergoing development and testing.

### Solution Architecture
![Architecture Diagram](architecture.png)

(Details forthcoming on the solution illustration)

### Testing
To test it:
- deploy the CDK application using the instructions below (this has been tested to work)
- below here nothing has been tested :) 
- enable Bedrock Model Access for Amazon Nova Lite V1
- once CDK has been deployed, you will likely need to manually start a sync for the blockchain news knowledge base web crawler

### Prepare Environment

1. Copy `.env.sample` to a new `.env` file
2. Update `.env` with the appropriate values, including the AWS account ID. If you would like your agent to query current  cryptocurrency prices, you will need to obtain a CoinGecko API key; otherwise, you can skip this. The default solution uses Polygon mainnet via Amazon Managed Blockchain. You can override this and use a different network and provider by setting an RPC endpoint for `BLOCKCHAIN_RPC_URL`. 

### Install dependencies

```
npm install
```

### Deploy the stacks

Install CDK locally
```
npm install -g aws-cdk
```

If you have not done so in this account before, you will need to bootstrap your account for CDK before deploying the stacks.
```
cdk bootstrap aws://${CDK_DEPLOY_ACCOUNT}/${CDK_DEPLOY_REGION}
```

There are several stacks to deploy, and you can deploy all of them at once by running:
```
cdk deploy --all --require-approval never
```

The deployment time is about 10 minutes.

### Enable model access

If you have not used Claude Haiku v1 in this account before, you will need to enable this.
1. Open the Bedrock console
2. xxx

### Orchestrating the two agents together

The solution deploys two agents; a Supervisor Agent (Crypto AI Agent) which coordinates the user requests across various tasks, and a Collaborator Agent (Blockchain Data Agent) which fulfills a specific need of accessing historic blockchain data. We want our users to only have to send their queries to the Supervisor Agent, instead of needing to switch between agents. Therefore, any time a user wants to query historic blockchain data, we need our Supervisor Agent to delegate this request to the Collaborator Agent. The steps below guide you on how to do this.

rough outline:
1. from supervisor agent, enable multi-agent collaboration.
2. under Collaboration configuration, select `Supervisor`
3. select the blockchain data agent as the collaborator, and select a version (or alias?)
4. set the collaborator name to `blockchain-data-collaborator-agent`
5. set the Collaborator instruction to `The blockchain-data-collaborator-agent can query historic bitcoin and ethereum data, providing data such as number of transactions within a period of time, details of a block, or how many times a token was a transferred within a period of time.`
6. Click 'save and exit'. Click `Prepare` to prepare a new version of the agent.


### Troubleshooting Deployment Issues

#### Python Dependencies Error
If you encounter an error during deployment related to Python dependencies bundling, ensure Docker is running on your machine

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

