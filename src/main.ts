import { App, Construct, Stack, StackProps, Tags } from '@aws-cdk/core';
import { envVars, validateEnvVariables } from './lib/config';
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

const pipelineStack = new PipelineStack(app, `eb-${envVars.APP_NAME}-pipeline-stack`, { env: { account: '955697143463', region: 'ap-northeast-2' } });

Tags.of(pipelineStack).add('cz-project', 'magicmall');
Tags.of(pipelineStack).add('cz-org', 'skmg');
Tags.of(pipelineStack).add('cz-stage', ' ');
Tags.of(pipelineStack).add('cz-customer', 'LeeSungik' );
Tags.of(pipelineStack).add('cz-ext1', ' ' );
Tags.of(pipelineStack).add('cz-ext2', ' ' );
Tags.of(pipelineStack).add('cz-ext3', ' ' );