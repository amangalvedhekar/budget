import {
  JiraClient,
  JiraRequestError,
  parseJiraTokenSecret,
} from "./jira";

const config = {
  cloudId: "cloud-id",
  projectKey: "FEED",
  siteUrl: "https://budgetgenie.atlassian.net",
};

const input = {
  category: "APP_ISSUE" as const,
  title: "Broken chart",
  details: "The chart does not load.",
};

describe("JiraClient", () => {
  it("creates a Task in the configured Jira space", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ id: "10001", key: "FEED-1" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );
    const client = new JiraClient(config, async () => "secret-token", fetchMock);

    await expect(client.createExperience(input)).resolves.toEqual({
      issueKey: "FEED-1",
      issueUrl: "https://budgetgenie.atlassian.net/browse/FEED-1",
    });

    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toContain("/cloud-id/rest/api/3/issue");
    expect(request.headers.Authorization).toBe("Bearer secret-token");
    const body = JSON.parse(request.body);
    expect(body.fields).toMatchObject({
      project: { key: "FEED" },
      issuetype: { name: "Task" },
      labels: ["app-feedback", "feedback-bug"],
    });
  });

  it("does not expose Jira response bodies in errors", async () => {
    const fetchMock = vi.fn(async () =>
      new Response('{"errorMessages":["sensitive"]}', {
        status: 403,
        headers: { "Retry-After": "2" },
      })
    );
    const client = new JiraClient(config, async () => "secret-token", fetchMock);

    await expect(client.createExperience(input)).rejects.toEqual(
      expect.objectContaining<JiraRequestError>({
        status: 403,
        retryAfter: "2",
      })
    );
  });
});

describe("parseJiraTokenSecret", () => {
  it("reads the token from the configured Secrets Manager field", () => {
    expect(
      parseJiraTokenSecret(
        JSON.stringify({ "budget/jira-api-token": "secret-token" })
      )
    ).toBe("secret-token");
  });
});
