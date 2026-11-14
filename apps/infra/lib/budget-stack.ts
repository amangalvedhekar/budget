import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "node:path";

export class BudgetStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props?: cdk.StackProps
  ) {
    super(scope, id, props);

    const api = new nodejs.NodejsFunction(this, "BudgetApi", {
      entry: path.resolve(
        process.cwd(),
        "../api/src/lambda.ts"
      ),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
      bundling: {
        minify: true,
        sourceMap: true,
        loader: {
          ".graphql": "text",
        },
      },
    });

    const url = api.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
    });

    new cdk.CfnOutput(this, "GraphQLUrl", {
      value: url.url,
    });
  }
}
