#!/usr/bin/env node

import * as cdk from "aws-cdk-lib";
import { BudgetStack } from "../lib/budget-stack";

const app = new cdk.App();

new BudgetStack(app, "BudgetApiStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
