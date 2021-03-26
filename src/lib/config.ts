import * as chalk from 'chalk';

export const envVars = {
  REGION: process.env.REGION || 'ap-northeast-2',
  APP_NAME: process.env.APP_NAME || 'petclinic-app',
  REPO_OWNER: process.env.REPO_OWNER || 'jingood2',
  REPO_NAME: process.env.REPO_NAME || 'spring-petclinic',
  APP_STAGE_NAME: process.env.APP_STAGE_NAME || 'develop',
  // change this to the branch of your choice
  BUILD_BRANCH: process.env.BUILD_BRANCH || 'main',
  VPC_ID: 'vpc-07db512afbc65d743',
  PUB_SUBNET_ID: 'subnet-02e9c39807e853e29,subnet-03ed230c41c168b8c',
  PRI_SUBNET_ID: 'subnet-0c82e48557abf2f9d,subnet-084521c508b6fe543',
  PLATFORM: 'Tomcat',
  PLATFORM_STACK: '64bit Amazon Linux 2 v4.1.6 running Tomcat 8.5 Corretto 8',

};

export function validateEnvVariables() {
  for (let variable in envVars) {
    if (!envVars[variable as keyof typeof envVars]) {
      throw Error(
        chalk.red(`[app]: Environment variable ${variable} is not defined!`),
      );
    }
  }
}