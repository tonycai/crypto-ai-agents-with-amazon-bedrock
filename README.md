# Welcome to Crypto AI Agents on Amazon Bedrock

This repo still needs a lot of testing.

To test it:
- deploy the CDK application using the instructions below (this has been tested to work)
- below here nothing has been tested :) 
- enable Bedrock Model Access for Amazon Nova Lite V1
- once CDK has been deployed, you will likely need to manually start a sync for the blockchain news knowledge base web crawler

### Prepare Environment
1. Copy `.env.sample` to a new `.env` file
2. Update `.env` with the appropriate values, including the AWS account ID. You will also require a CoinGecko API key; however you can skip this for now if you are not planning to use the blockchain news knowledge base.

### Install dependencies
Run `npm install` to install the dependencies

### Deploy the stacks
Install CDK
```
npm install -g aws-cdk
```

If you have not done so in this account before, you will need to run CDK bootstrap before deploying the stacks.
```
cdk bootstrap aws://${CDK_DEPLOY_ACCOUNT}/${CDK_DEPLOY_REGION}
```

There are several stacks to deploy, and you can deploy all of them at once by running:
```
cdk deploy --all --require-approval never
```

The deployment time is about 10 minutes.

### Troubleshooting Deployment Issues

#### Python Dependencies Error
If you encounter an error during deployment related to Python dependencies bundling, ensure Docker is running on your machine

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

