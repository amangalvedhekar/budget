import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import { HttpJwtAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as path from "node:path";

export interface BudgetStackProps extends cdk.StackProps {
  apiDomainName: string;
  certificateArn: string;
  cognitoUserPoolId: string;
  cognitoUserPoolClientId: string;
  jiraCloudId: string;
  jiraProjectKey: string;
  jiraSiteUrl: string;
  jiraApiTokenSecretName: string;
}

export class BudgetStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: BudgetStackProps
  ) {
    super(scope, id, props);

    const api = new nodejs.NodejsFunction(this, "BudgetApi", {
      entry: path.resolve(
        process.cwd(),
        "../api/src/lambda.ts"
      ),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_24_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(15),
      logRetention: logs.RetentionDays.ONE_MONTH,
      environment: {
        JIRA_CLOUD_ID: props.jiraCloudId,
        JIRA_PROJECT_KEY: props.jiraProjectKey,
        JIRA_SITE_URL: props.jiraSiteUrl,
        JIRA_API_TOKEN_SECRET_NAME: props.jiraApiTokenSecretName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        loader: {
          ".graphql": "text",
        },
      },
    });

    const jiraApiToken = secretsmanager.Secret.fromSecretNameV2(
      this,
      "JiraApiToken",
      props.jiraApiTokenSecretName
    );
    jiraApiToken.grantRead(api);

    const certificate = acm.Certificate.fromCertificateArn(
      this,
      "ApiCertificate",
      props.certificateArn
    );

    const domainName = new apigwv2.DomainName(this, "ApiDomainName", {
      domainName: props.apiDomainName,
      certificate,
    });

    const httpApi = new apigwv2.HttpApi(this, "BudgetHttpApi", {
      apiName: "budget-api",
      defaultDomainMapping: {
        domainName,
      },
      disableExecuteApiEndpoint: true,
    });

    const authorizer = new HttpJwtAuthorizer(
      "CognitoAuthorizer",
      `https://cognito-idp.${this.region}.amazonaws.com/${props.cognitoUserPoolId}`,
      {
        jwtAudience: [props.cognitoUserPoolClientId],
      }
    );

    httpApi.addRoutes({
      path: "/graphql",
      methods: [apigwv2.HttpMethod.POST],
      integration: new HttpLambdaIntegration("GraphQLIntegration", api),
      authorizer,
    });

    new cdk.CfnOutput(this, "GraphQLUrl", {
      value: `https://${props.apiDomainName}/graphql`,
    });

    new cdk.CfnOutput(this, "ApiDomainTarget", {
      value: domainName.regionalDomainName,
    });
  }
}
