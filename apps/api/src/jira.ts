import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import {
  labelForCategory,
  textToAdf,
  type ShareExperienceInput,
} from "./feedback";

interface JiraConfig {
  cloudId: string;
  projectKey: string;
  siteUrl: string;
}

interface JiraCreatedIssue {
  id: string;
  key: string;
}

export interface SharedExperience {
  issueKey: string;
  issueUrl: string;
}

export class JiraRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfter?: string
  ) {
    super(message);
    this.name = "JiraRequestError";
  }
}

type Fetch = typeof fetch;
type TokenProvider = () => Promise<string>;

export class JiraClient {
  constructor(
    private readonly config: JiraConfig,
    private readonly tokenProvider: TokenProvider,
    private readonly fetchImplementation: Fetch = fetch
  ) {}

  async createExperience(
    input: ShareExperienceInput
  ): Promise<SharedExperience> {
    const token = await this.tokenProvider();
    const response = await this.fetchImplementation(
      `https://api.atlassian.com/ex/jira/${this.config.cloudId}/rest/api/3/issue`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({
          fields: {
            project: { key: this.config.projectKey },
            issuetype: { name: "Task" },
            summary: input.title,
            description: textToAdf(input.details),
            labels: ["app-feedback", labelForCategory(input.category)],
          },
        }),
      }
    );

    if (!response.ok) {
      throw new JiraRequestError(
        `Jira rejected the request with status ${response.status}.`,
        response.status,
        response.headers.get("retry-after") ?? undefined
      );
    }

    const issue = (await response.json()) as JiraCreatedIssue;
    if (!issue.key) {
      throw new JiraRequestError("Jira returned an invalid response.", 502);
    }

    return {
      issueKey: issue.key,
      issueUrl: `${this.config.siteUrl.replace(/\/$/, "")}/browse/${issue.key}`,
    };
  }
}

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

let cachedToken: string | undefined;
const secretsManager = new SecretsManagerClient({});

async function getJiraToken(): Promise<string> {
  if (cachedToken) {
    return cachedToken;
  }

  const result = await secretsManager.send(
    new GetSecretValueCommand({
      SecretId: requireEnvironmentVariable("JIRA_API_TOKEN_SECRET_NAME"),
    })
  );

  const secret = result.SecretString?.trim();
  if (!secret) {
    throw new Error("The Jira API token secret has no string value.");
  }

  cachedToken = parseJiraTokenSecret(secret);
  return cachedToken;
}

export function parseJiraTokenSecret(secret: string): string {
  if (!secret.startsWith("{")) {
    return secret;
  }

  const values = JSON.parse(secret) as Record<string, unknown>;
  const token =
    values.token ??
    values.JiraAPITOKEN ??
    values.apiToken ??
    values["budget/jira-api-token"];
  if (typeof token !== "string" || !token) {
    throw new Error("The Jira API token JSON has no supported token field.");
  }
  return token;
}

let defaultClient: JiraClient | undefined;

export function getJiraClient(): JiraClient {
  defaultClient ??= new JiraClient(
    {
      cloudId: requireEnvironmentVariable("JIRA_CLOUD_ID"),
      projectKey: requireEnvironmentVariable("JIRA_PROJECT_KEY"),
      siteUrl: requireEnvironmentVariable("JIRA_SITE_URL"),
    },
    getJiraToken
  );
  return defaultClient;
}
