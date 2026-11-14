#!/usr/bin/env node

import * as cdk from "aws-cdk-lib";
import { BudgetStack } from "../lib/budget-stack";

const app = new cdk.App();

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

new BudgetStack(app, "BudgetApiStack", {
  apiDomainName: requireEnvironmentVariable("API_DOMAIN_NAME"),
  certificateArn: requireEnvironmentVariable("ACM_CERTIFICATE_ARN"),
  cognitoUserPoolId: requireEnvironmentVariable("COGNITO_USER_POOL_ID"),
  cognitoUserPoolClientId: requireEnvironmentVariable(
    "COGNITO_USER_POOL_CLIENT_ID"
  ),
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
