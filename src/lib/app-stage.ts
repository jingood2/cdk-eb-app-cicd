import * as cdk from '@aws-cdk/core';
import { BeanstalkStack } from './beanstalk-stack';
import { envVars } from './config';

export interface BeanstalkStageProps extends cdk.StackProps {
  stage: string;
}

export class BeanstalkStage extends cdk.Stage {
  constructor(scope: cdk.Construct, id: string, props: BeanstalkStageProps) {
    super(scope, id, props);

    new BeanstalkStack(this, `eb-${envVars.APP_NAME}-${props.stage}-infra`, { stage: props.stage });
  }
}