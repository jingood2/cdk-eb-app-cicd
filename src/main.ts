import { App, Construct, Stack, StackProps } from '@aws-cdk/core';
import { validateEnvVariables } from './lib/config';
import { PipelineStack } from './lib/pipeline-stack';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
  }
}

// for development, use account/region from cdk cli
/* const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};
 */
validateEnvVariables();
const app = new App();

new PipelineStack(app, 'CdkEBPipeline', { env: { account: '955697143463', region: 'ap-northeast-2' } });
// new MyStack(app, 'my-stack-prod', { env: prodEnv });

//app.synth();