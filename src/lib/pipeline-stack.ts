import { Artifact } from '@aws-cdk/aws-codepipeline';
import { GitHubSourceAction, GitHubTrigger } from '@aws-cdk/aws-codepipeline-actions';
import * as cdk from '@aws-cdk/core';
// eslint-disable-next-line no-duplicate-imports
import { SecretValue } from '@aws-cdk/core';
import { CdkPipeline, SimpleSynthAction } from '@aws-cdk/pipelines';
import { BeanstalkStage } from './app-stage';

export interface PipelineStackProps extends cdk.StackProps {

}

export class PipelineStack extends cdk.Stack {

  pipeline: CdkPipeline;
  sourceArtifact: Artifact;
  cloudAssemblyArtifact: Artifact;
  sourceAction: GitHubSourceAction;

  constructor(scope: cdk.Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    this.sourceArtifact = new Artifact();
    this.cloudAssemblyArtifact = new Artifact();

    this.sourceAction = new GitHubSourceAction({
      actionName: 'GitHub',
      output: this.sourceArtifact,
      oauthToken: SecretValue.secretsManager('atcl/jingood2/github-token'),
      trigger: GitHubTrigger.POLL,
      owner: 'jingood2',
      repo: this.node.tryGetContext('repositoryName'),
      branch: 'main',
    });

    this.pipeline = new CdkPipeline(this, 'pipeline', {
      pipelineName: 'cdk-tomcat-beanstalk-pipeline',
      cloudAssemblyArtifact: this.cloudAssemblyArtifact,
      sourceAction: this.sourceAction,
      synthAction: SimpleSynthAction.standardYarnSynth({
        sourceArtifact: this.sourceArtifact,
        cloudAssemblyArtifact: this.cloudAssemblyArtifact,
        installCommand: 'yarn install --frozen-lockfile && yarn projen',
        buildCommand: 'yarn build',
      }),
    });

    this.pipeline.addApplicationStage(new BeanstalkStage(this, 'DEV', {}));
  }
}