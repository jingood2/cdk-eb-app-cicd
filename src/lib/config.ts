import * as chalk from 'chalk';

export const envVars = {
  REGION: process.env.REGION || 'ap-northeast-2',
  APP_NAME: process.env.APP_NAME || 'my-web-app',
  REPO_OWNER: process.env.REPO_OWNER || 'jingood2',
  REPO_NAME: process.env.REPO_NAME || 'my-web-app',
  APP_STAGE_NAME: process.env.APP_STAGE_NAME || 'develop',
  // change this to the branch of your choice
  BUILD_BRANCH: process.env.BUILD_BRANCH || 'master',
  VPC_ID: 'vpc-0718c770a1fe6ebe6',
  PUB_SUBNET_ID: 'subnet-06bab824613954777,subnet-0e4882323b34072f0',
  PRI_SUBNET_ID: 'subnet-0a96c515fce44d495',
  PLATFORM: 'Tomcat',

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