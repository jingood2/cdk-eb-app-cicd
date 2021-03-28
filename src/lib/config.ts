import * as chalk from 'chalk';

export const envVars = {
  REGION: process.env.REGION || 'ap-northeast-2',
  APP_NAME: process.env.APP_NAME || 'ebapp',
  REPO_OWNER: process.env.REPO_OWNER || 'jingood2',
  REPO_NAME: process.env.REPO_NAME || 'spring-petclinic',
  APP_STAGE_NAME: process.env.APP_STAGE_NAME || 'develop',
  // change this to the branch of your choice
  BUILD_BRANCH: process.env.BUILD_BRANCH || 'develop',
  PLATFORM_STACK: '64bit Amazon Linux 2 v3.1.6 running Corretto 11',

  DEV: {
    VPC_ID: 'vpc-07db512afbc65d743',
    PUB_SUBNET_ID: 'subnet-02e9c39807e853e29,subnet-03ed230c41c168b8c',
    PRI_SUBNET_ID: 'subnet-0c82e48557abf2f9d,subnet-084521c508b6fe543',
  },
  PROD: {
    VPC_ID: 'vpc-07a6df880ea491c9b',
    PUB_SUBNET_ID: 'subnet-0acc388f4c3ff2a70,subnet-068db502c289996b6',
    PRI_SUBNET_ID: 'subnet-010f8e5648b45477d,subnet-08827edc7c99e8887',
  },

  /*  VPC_ID: 'vpc-07db512afbc65d743',
  PUB_SUBNET_ID: 'subnet-02e9c39807e853e29,subnet-03ed230c41c168b8c',
  PRI_SUBNET_ID: 'subnet-0c82e48557abf2f9d,subnet-084521c508b6fe543',
 */
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