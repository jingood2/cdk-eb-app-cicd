// eslint-disable-next-line import/no-unresolved
import * as Codebuild from '@aws-cdk/aws-codebuild';
// eslint-disable-next-line no-duplicate-imports
import { Artifacts } from '@aws-cdk/aws-codebuild';
import * as EB from '@aws-cdk/aws-elasticbeanstalk';
import * as IAM from '@aws-cdk/aws-iam';
import { Bucket } from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
// eslint-disable-next-line no-duplicate-imports
import { envVars } from './config';


export interface BeanstalkStackProps extends cdk.StackProps {
  stage: string;
}

export class BeanstalkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: BeanstalkStackProps) {
    super(scope, id, props);

    // get platform to be created
    //const platform = this.node.tryGetContext('platform');

    // beanstalk project setup
    const ebApp = new EB.CfnApplication(this, `${envVars.APP_NAME}-${props.stage}`, {
      applicationName: `${envVars.APP_NAME}-${props.stage}`,
    });


    // role for ec2 instance
    const options: EB.CfnEnvironment.OptionSettingProperty[] = [
      {
        namespace: 'aws:ec2:vpc',
        optionName: 'VPCId',
        value: props.stage == 'dev'? envVars.DEV.VPC_ID : envVars.PROD.VPC_ID,
      },

      {
        namespace: 'aws:ec2:vpc',
        optionName: 'ELBSubnets',
        value: props.stage == 'dev'? envVars.DEV.PUB_SUBNET_ID : envVars.PROD.PUB_SUBNET_ID,
      },
      {
        namespace: 'aws:ec2:vpc',
        optionName: 'Subnets',
        value: props.stage == 'dev'? envVars.DEV.PRI_SUBNET_ID : envVars.PROD.PRI_SUBNET_ID,
      },
      {
        namespace: 'aws:elasticbeanstalk:environment',
        optionName: 'LoadBalancerType',
        value: 'application',
      },
      {
        namespace: 'aws:elasticbeanstalk:environment:process:default',
        optionName: 'Port',
        value: '8080',
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
    ];

    const ebEnv = new EB.CfnEnvironment(this, `${envVars.APP_NAME}-${props.stage}-env`, {
      // default environmentName is `develop`
      environmentName: `${envVars.APP_NAME}-${envVars.APP_STAGE_NAME}`,
      applicationName: `envVars.APP_NAME-${props.stage}`,
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

    /* new Codebuild.GitHubSourceCredentials(this, 'GithubCredentials', {
      accessToken: cdk.SecretValue.secretsManager('magicmall/aws-github-token'),
    }); */

    let buildProject;

    if (props.stage == 'dev') {
      let repo = Codebuild.Source.gitHub({
        owner: envVars.REPO_OWNER,
        repo: envVars.REPO_NAME,
        webhook: true,
        //oauthToken: SecretValue.secretsManager('atcl/jingood2/github-token'),
        webhookFilters: webhooks,
        reportBuildStatus: true,
      });

      buildProject = new Codebuild.Project(this, `${envVars.APP_NAME}-${props.stage}-build`, {
        ///buildSpec: Codebuild.BuildSpec.fromSourceFilename('buildspec.yml'),
        badge: true,
        artifacts: Artifacts.s3({
          bucket: Bucket.fromBucketName(this, 'Build-Output-Bucket', 'elasticbeanstalk-ap-northeast-2-955697143463' ),
          includeBuildId: false,
          path: envVars.APP_NAME,
          name: 'result.zip',
          packageZip: true,
        }),
        buildSpec: Codebuild.BuildSpec.fromObject({
          version: '0.2',
          phases: {
            install: {
              commands: [
                'echo Installing awscli',
                'curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"',
                'unzip awscliv2.zip',
                './aws/install',
              ],
            },
            build: {
              commands: [
                'echo build started on `date +%s`',
                //`eb init ${envVars.APP_NAME} --region ${envVars.REGION} --platform tomcat-8-java-8`,
                //`eb deploy ${envVars.APP_STAGE_NAME}`,
                //'./mvnw -DskipTests package',
                //'export POM_VERSION=$(mvn -q -Dexec.executable=echo -Dexec.args=\'${project.version}\' --non-recursive exec:exec)',
                'export WAR_NAME=app-1.0-SNAPSHOT.jar',
                'export EB_VERSION=1.0-SNAPSHOT_`date +%s`',
                //'export BUILD_ID=${CODE_BUILD_ID}',
                //'cp target/*.jar app.jar',
                'export S3_KEY=${EB_APP_NAME}/result.zip',
                'aws s3 cp target/*.jar s3://elasticbeanstalk-ap-northeast-2-955697143463/app-1.0-SNAPSHOT.jar',
                //'aws elasticbeanstalk create-application-version --application-name ${EB_APP_NAME} --version-label ${EB_VERSION} --source-bundle S3Bucket=elasticbeanstalk-ap-northeast-2-955697143463,S3Key=${WAR_NAME}',
                //'aws elasticbeanstalk update-environment --application-name ${EB_APP_NAME} --version-label ${EB_VERSION} --environment-name petclinic-develop',
                'export EB_ENVIRONMENT=${EB_APP_NAME}-${EB_STAGE}',
                'echo {"EB_VERSION": ${EB_VERSION}, "S3_KEY": ${S3_KEY}} > result.json',
                //'mvn package',
                //'mv target/*.war ROOT.war',
              ],
            },
            post_build: {
              commands: [
                'env',
                'aws elasticbeanstalk create-application-version --application-name ${EB_APP_NAME} --version-label ${EB_VERSION} --source-bundle S3Bucket=elasticbeanstalk-ap-northeast-2-955697143463,S3Key=${WAR_NAME}',
                'aws elasticbeanstalk update-environment --application-name ${EB_APP_NAME} --version-label ${EB_VERSION} --environment-name ${EB_ENVIRONMENT}',
              ],
            },
          },
          artifacts: {
            files: [
              'result.json',
            ],
          },
        }),
        projectName: `${envVars.APP_NAME}-${props.stage}-project`,
        environment: {
          buildImage: Codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
          computeType: Codebuild.ComputeType.SMALL,
          environmentVariables: {
            WAR_NAME: {
              value: 'app-1.0-SNAPSHOT.jar',
            },
            EB_STAGE: {
              value: props.stage,
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
            /* EB_VERSION: {
              value: '1.0-SNAPSHOT' + new Date().getTime(),
            }, */

          },
        },
        source: repo,
        cache: Codebuild.Cache.bucket(new Bucket(this, 'MyBucket')),
        timeout: cdk.Duration.minutes(15),
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

    } else if (props.stage == 'prod') {

      buildProject = new Codebuild.Project(this, `${envVars.APP_NAME}-${props.stage}-deploy`, {
        ///buildSpec: Codebuild.BuildSpec.fromSourceFilename('buildspec.yml'),
        buildSpec: Codebuild.BuildSpec.fromObject({
          version: '0.2',
          phases: {
            install: {
              commands: [
                'echo Installing awscli',
                'curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"',
                'unzip awscliv2.zip',
                './aws/install',
              ],
            },
            build: {
              commands: [
                'echo build started on `date +%s`',
                //`eb init ${envVars.APP_NAME} --region ${envVars.REGION} --platform tomcat-8-java-8`,
                //`eb deploy ${envVars.APP_STAGE_NAME}`,
                './mvnw -DskipTests package',
                'export S3_KEY=${EB_APP_NAME}/result.zip',
                'export WAR_NAME=app-1.0-SNAPSHOT.jar',
                'export EB_ENVIRONMENT=${EB_APP_NAME}-${EB_STAGE}',
                'export EB_VERSION=1.0-SNAPSHOT_`date +%s`',
                'env',
                //'aws s3 cp target/*.jar s3://elasticbeanstalk-ap-northeast-2-955697143463/app-1.0-SNAPSHOT.jar',
                'aws elasticbeanstalk create-application-version --application-name ${EB_APP_NAME} --version-label ${EB_VERSION} --source-bundle S3Bucket=elasticbeanstalk-ap-northeast-2-955697143463,S3Key=${WAR_NAME}',
                'aws elasticbeanstalk update-environment --application-name ${EB_APP_NAME} --version-label ${EB_VERSION} --environment-name petclinic-develop',
                //'echo {"EB_VERSION": ${EB_VERSION}, "BUILD_ID": ${CODEBUILD_BUILD_ID}} > result.json',
                //'mvn package',
                //'mv target/*.war ROOT.war',
              ],
            },
            /* post_build: {
              commands: [
                'env',
                'aws elasticbeanstalk create-application-version --application-name ${EB_APP_NAME} --version-label ${EB_VERSION} --source-bundle S3Bucket=elasticbeanstalk-ap-northeast-2-955697143463,S3Key=${S3_KEY}',
                'aws elasticbeanstalk update-environment --application-name ${EB_APP_NAME} --version-label ${EB_VERSION} --environment-name petclinic-develop',
              ],
            }, */
          },
        }),
        projectName: `${envVars.APP_NAME}-${props.stage}-project`,
        environment: {
          buildImage: Codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
          computeType: Codebuild.ComputeType.SMALL,
          environmentVariables: {
            WAR_NAME: {
              value: 'app-1.0-SNAPSHOT.jar',
            },
            EB_STAGE: {
              value: props.stage,
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
            /* EB_VERSION: {
              value: '1.0-SNAPSHOT' + new Date().getTime(),
            }, */

          },
        },
        timeout: cdk.Duration.minutes(15),
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
}