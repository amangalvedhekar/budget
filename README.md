# Budget API

Backend services and AWS infrastructure for Budget. This repository is an
[Nx](https://nx.dev/) workspace written in TypeScript.

## What is in the repository

| Project | Path | Purpose |
| --- | --- | --- |
| `api` | `apps/api` | Apollo GraphQL API, with local Node and AWS Lambda entry points |
| `api-e2e` | `apps/api-e2e` | End-to-end tests for the API |
| `infra` | `apps/infra` | AWS CDK stack used to deploy the API |

The GraphQL API currently provides:

- `projectDebtPayment`, which calculates a fixed-payment debt payoff projection
  and amortization schedule.
- `shareExperience`, which validates app feedback and creates a Jira issue.

The deployed API runs as a Node.js 24 Lambda behind an API Gateway HTTP API. The
`POST /graphql` route is protected by a Cognito JWT authorizer. The stack also
configures an existing ACM certificate and custom API domain, grants the Lambda
access to an existing Secrets Manager secret containing the Jira API token, and
keeps Lambda logs for one month.

## Prerequisites

- Node.js with npm
- AWS credentials for the target account
- AWS CDK prerequisites bootstrapped in the target account and region
- An existing Cognito user pool and app client
- An existing ACM certificate valid for the API domain and available in the
  deployment region
- An existing AWS Secrets Manager secret containing the Jira API token
- A Jira Cloud project and its cloud ID

Install the workspace dependencies with the checked-in lockfile:

```sh
npm ci
```

## Configuration

Copy `.env.example` to `.env` and replace the example values:

```sh
cp .env.example .env
```

| Variable | Used for |
| --- | --- |
| `AWS_REGION` | Convenience value for AWS CLI commands; CDK itself uses `CDK_DEFAULT_REGION` |
| `API_DOMAIN_NAME` | Custom hostname for the GraphQL API |
| `ACM_CERTIFICATE_ARN` | ARN of the existing certificate for that hostname |
| `COGNITO_USER_POOL_ID` | Cognito user pool used as the JWT issuer |
| `COGNITO_USER_POOL_CLIENT_ID` | Allowed JWT audience |
| `JIRA_CLOUD_ID` | Atlassian cloud ID used by the Jira REST API |
| `JIRA_PROJECT_KEY` | Jira project that receives feedback issues |
| `JIRA_SITE_URL` | Base Jira site URL used to construct returned issue links |
| `JIRA_API_TOKEN_SECRET_NAME` | Name of the existing Secrets Manager secret |

The Jira secret may be either a plain token string or JSON containing a token in
one of the fields `token`, `JiraAPITOKEN`, or `apiToken`.

The CDK app reads configuration directly from the process environment; it does
not load `.env` automatically. Export the file before running infrastructure
commands:

```sh
set -a
source .env
set +a

export CDK_DEFAULT_REGION="$AWS_REGION"
export CDK_DEFAULT_ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
```

## Available commands

Commands are run from the repository root.

### API

```sh
# Start the local GraphQL server at http://localhost:4000
npx nx serve api

# Create a production build in dist/apps/api
npx nx build api

# Run API unit tests once
npx nx test api --run

# Run API tests in watch mode
npx nx test api

# Lint the API
npx nx lint api
```

The local server supplies a development user identity, so GraphQL operations are
treated as authenticated. `shareExperience` still requires the Jira environment
variables, valid AWS credentials, and access to the configured secret.

### End-to-end tests

```sh
npx nx e2e api-e2e
```

The e2e target starts the API as a dependency. Its Jest executor also requires
the Nx/Jest packages to be installed; they are not currently listed in
`package.json`.

### Infrastructure

Load the environment variables described above before using these commands.

```sh
# Type-check the CDK application
npx nx typecheck infra

# Generate the CloudFormation template
npx nx synth infra

# Preview changes against the deployed stack
npx nx diff infra

# Deploy the stack
npx nx deploy infra

# Remove the stack
npx nx destroy infra
```

Useful workspace-wide commands:

```sh
npx nx show projects
npx nx graph
npx nx run-many -t lint
npx nx run-many -t test -- --run
```

## Deployment

The CDK stack is named `BudgetApiStack` and deploys to the account and region
selected by the active AWS credentials, `CDK_DEFAULT_ACCOUNT`, and
`CDK_DEFAULT_REGION`.

1. Install dependencies and load the deployment environment as shown above.
2. Create the Jira token secret if it does not already exist. For a plain token:

   ```sh
   aws secretsmanager create-secret \
     --name "$JIRA_API_TOKEN_SECRET_NAME" \
     --secret-string '<jira-api-token>' \
     --region "$CDK_DEFAULT_REGION"
   ```

   If the secret already exists, update it instead of creating another one.

3. Bootstrap CDK once per AWS account and region:

   ```sh
   (cd apps/infra && npx cdk bootstrap \
     "aws://$CDK_DEFAULT_ACCOUNT/$CDK_DEFAULT_REGION")
   ```

4. Review and deploy:

   ```sh
   npx nx typecheck infra
   npx nx synth infra
   npx nx diff infra
   npx nx deploy infra
   ```

5. After deployment, use the `ApiDomainTarget` stack output to create the DNS
   record for `API_DOMAIN_NAME`. Use a CNAME where supported or an alias record
   with a DNS provider such as Route 53. DNS is not managed by this stack.

The deployment outputs `GraphQLUrl` for the final endpoint and
`ApiDomainTarget` for DNS configuration. Clients call `POST /graphql` with a
valid Cognito access or ID token in the `Authorization: Bearer <token>` header.

## Repository layout

```text
apps/
  api/       GraphQL schema, resolvers, Lambda handler, and unit tests
  api-e2e/   API end-to-end tests
  infra/     CDK application and BudgetApiStack
```
