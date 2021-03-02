import * as cdk from '@aws-cdk/core';
import { BeanstalkStack } from './beanstalk-stack';

export interface BeanstalkStageProps extends cdk.StackProps {

}

export class BeanstalkStage extends cdk.Stage {
  constructor(scope: cdk.Construct, id: string, props: BeanstalkStageProps) {
    super(scope, id, props);

    new BeanstalkStack(this, 'EBStack', {});
  }
}