// eslint-disable-next-line import/no-unresolved
import * as Codebuild from '@aws-cdk/aws-codebuild';
import * as EB from '@aws-cdk/aws-elasticbeanstalk';
import * as IAM from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';
import { envVars } from './config';


export interface BeanstalkStackProps extends cdk.StackProps {

}

export class BeanstalkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: BeanstalkStackProps) {
    super(scope, id, props);

    // get platform to be created
    //const platform = this.node.tryGetContext('platform');

    // beanstalk project setup
    const ebApp = new EB.CfnApplication(this, `${envVars.APP_NAME}-app`, {
      applicationName: envVars.APP_NAME,
    });

    // role for ec2 instance
    const options: EB.CfnEnvironment.OptionSettingProperty[] = [
      {
        namespace: 'aws:ec2:vpc',
        optionName: 'VPCId',
        value: this.node.tryGetContext('VPC_ID'),

      },
      /*   {
        namespace: 'aws:ec2:vpc',
        optionName: 'ELBSubnets',
        value: this.node.tryGetContext('PUB_SUBNET_ID'),

      }, */
      {
        namespace: 'aws:ec2:vpc',
        optionName: 'Subnets',
        value: this.node.tryGetContext('PRI_SUBNET_ID'),
      },
      {
        namespace: 'aws:ec2:instances',
        optionName: 'InstanceTypes',
        value: 't3.micro',
      },
      {
        namespace: 'aws:autoscaling:launchconfiguration',
        optionName: 'IamInstanceProfile',
        // Here you could reference an instance profile by ARN (e.g. myIamInstanceProfile.attrArn)
        // For the default setup, leave this as is (it is assumed this role exists)
        // https://stackoverflow.com/a/55033663/6894670
        value: 'aws-elasticbeanstalk-ec2-role',
      },
      {
        namespace: 'aws:elasticbeanstalk:xray',
        optionName: 'XRayEnabled',
        value: 'true',
      },
    ];

    const appName = 'app';
    const ebEnv = new EB.CfnEnvironment(this, `${envVars.APP_NAME}-env`, {
      // default environmentName is `develop`
      environmentName: envVars.APP_STAGE_NAME,
      applicationName: ebApp.applicationName || appName,
      solutionStackName: '64bit Amazon Linux 2 v4.1.5 running Tomcat 8.5 Corretto 8',
      //platformArn: platform,
      optionSettings: options,
    });

    ebEnv.addDependsOn(ebApp);

    // codebuild project setup
    const webhooks: Codebuild.FilterGroup[] = [
      Codebuild.FilterGroup.inEventOf(
        Codebuild.EventAction.PUSH,
        Codebuild.EventAction.PULL_REQUEST_MERGED,
      ).andHeadRefIs(envVars.BUILD_BRANCH),
    ];

    const repo = Codebuild.Source.gitHub({
      owner: envVars.REPO_OWNER,
      repo: envVars.REPO_NAME,
      webhook: true,
      webhookFilters: webhooks,
      reportBuildStatus: true,
    });

    const project = new Codebuild.Project(this, envVars.APP_NAME, {
      //buildSpec: Codebuild.BuildSpec.fromSourceFilename('buildspec.yml'),
      buildSpec: Codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            runtime_versions: {
              java: 'corretto8',
            },
          },
          pre_build: {
            commands: ['npm install awsebcli'],
          },
          build: {
            commands: [
              'mvn package', 'mv target/*.war app.war',
            ],
          },
          post_build: {
            commands: [`eb deploy ${envVars.APP_STAGE_NAME}`],
          },
        },
        artifacts: {
          files: [
            'app.war',
            '.ebextenstions/**/*',
          ],
        },
      }),
      projectName: `${envVars.APP_NAME}-build`,
      environment: {
        buildImage: Codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
        computeType: Codebuild.ComputeType.SMALL,
        environmentVariables: {
          EB_STAGE: {
            value: envVars.APP_STAGE_NAME,
          },
          // you can add more env variables here as per your requirement
        },
      },
      source: repo,
      timeout: cdk.Duration.minutes(20),
    });

    project.role?.addManagedPolicy(
      IAM.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkFullAccess'),
    );
  }
}