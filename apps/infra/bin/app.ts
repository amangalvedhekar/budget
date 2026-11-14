#!/usr/bin/env node

import * as cdk from "aws-cdk-lib";
import { BudgetStack } from "../lib/budget-stack";

const app = new cdk.App();

new BudgetStack(app, "BudgetApiStack", {
  cognitoUserPoolId: "us-east-1_ZOcHnet4X",
  cognitoUserPoolClientId: "33g22bd3smodccocnl6r8af7d3",
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
});
