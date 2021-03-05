// eslint-disable-next-line import/no-unresolved
import * as Codebuild from '@aws-cdk/aws-codebuild';
import * as EB from '@aws-cdk/aws-elasticbeanstalk';
import * as IAM from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';
// eslint-disable-next-line no-duplicate-imports
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
        value: envVars.VPC_ID,
      },

      /* {
        namespace: 'aws:ec2:vpc',
        optionName: 'ELBSubnets',
        value: envVars.PUB_SUBNET_ID,
      },
 */
      {
        namespace: 'aws:ec2:vpc',
        optionName: 'Subnets',
        value: envVars.PUB_SUBNET_ID,
      },


      /*    {
        namespace: 'aws:autoscaling:asg',
        optionName: 'Availability Zones',
        value: 'Any',
      },
      {
        namespace: 'aws:autoscaling:asg',
        optionName: 'MaxSize',
        value: '3',
      },
      {
        namespace: 'aws:autoscaling:asg',
        optionName: 'MinSize',
        value: '1',
      }, */

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
    ];

    const ebEnv = new EB.CfnEnvironment(this, `${envVars.APP_NAME}-env`, {
      // default environmentName is `develop`
      environmentName: envVars.APP_STAGE_NAME,
      applicationName: envVars.APP_NAME,
      solutionStackName: envVars.PLATFORM_STACK,
      //platformArn: 'arn:aws:elasticbeanstalk:ap-northeast-2::platform/Corretto 8 running on 64bit Amazon Linux 2/3.1.6',
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

    new Codebuild.GitHubSourceCredentials(this, 'GithubCredentials', {
      accessToken: cdk.SecretValue.secretsManager('jingood2/aws-github-token'),
    });

    const repo = Codebuild.Source.gitHub({
      owner: envVars.REPO_OWNER,
      repo: envVars.REPO_NAME,
      webhook: true,
      //oauthToken: SecretValue.secretsManager('atcl/jingood2/github-token'),
      webhookFilters: webhooks,
      reportBuildStatus: true,
    });

    const buildProject= new Codebuild.Project(this, envVars.APP_NAME, {
      ///buildSpec: Codebuild.BuildSpec.fromSourceFilename('buildspec.yml'),
      buildSpec: Codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              'echo Installing eb-cli',
              'pip3 install awscli --upgrade',
            ],
          },

          build: {
            commands: [
              'echo build started on `date`',
              //`eb init ${envVars.APP_NAME} --region ${envVars.REGION} --platform tomcat-8-java-8`,
              //`eb deploy ${envVars.APP_STAGE_NAME}`,
              'mvn clean package',
              //'export POM_VERSION=$(mvn -q -Dexec.executable=echo -Dexec.args=\'${project.version}\' --non-recursive exec:exec)',
              'export WAR_NAME=app-1.0-SNAPSHOT.war',
              'export EB_VERSION=1.0-SNAPSHOT-`date`',
              'aws s3 cp target/*.war s3://elasticbeanstalk-ap-northeast-2-037729278610/$WAR_NAME',
              'env',
              'aws elasticbeanstalk create-application-version --application-name $EB_APP_NAME --version-label $EB_VERSION --source-bundle S3Bucket=elasticbeanstalk-ap-northeast-2-037729278610,S3Key=$WAR_NAME',
              'aws elasticbeanstalk update-environment --application-name `${envVars.APP_NAME}` --version-label `${EB_VERSION}` --environment-name `${ebEnv.environmentName}`',

              //'mvn package',
              //'mv target/*.war ROOT.war',
            ],
          },
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
          EB_APP_NAME: {
            value: envVars.APP_NAME,
          },
          EB_REGION: {
            value: envVars.REGION,
          },
          POM_VERSION: {
            value: '1.0-SNAPSHOT',
          },
        },
      },
      source: repo,
      timeout: cdk.Duration.minutes(30),
    });

    buildProject.role?.addManagedPolicy(
      IAM.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkFullAccess'),
    );

    buildProject.role?.addToPrincipalPolicy(new IAM.PolicyStatement({
      resources: ['*'],
      actions: ['elasticbeanstalk:*',
        'autoscaling:*',
        'elasticloadbalancing:*',
        'rds:*',
        's3:*',
        'ec2:*',
        'cloudwatch:*',
        'logs:*',
        'cloudformation:*'],
    }));
  }
}