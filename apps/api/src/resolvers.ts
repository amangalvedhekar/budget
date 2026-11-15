import {type DebtPaymentProjectionInput} from "./tools/types";
import {projectDebtPayment} from "./tools/debtProjection";
import { GraphQLError } from "graphql";
import {
  validateShareExperienceInput,
  type ShareExperienceInput,
} from "./feedback";
import { getJiraClient, JiraRequestError } from "./jira";

export interface GraphContext {
  userSub: string;
}

export const resolvers = {
  Query: {
    projectDebtPayment: (
      _parent: unknown,
      args: {
        input: DebtPaymentProjectionInput
      }
    ) => projectDebtPayment(args.input),
  },
  Mutation: {
    shareExperience: async (
      _parent: unknown,
      args: { input: ShareExperienceInput },
      context: GraphContext
    ) => {
      if (!context.userSub) {
        throw new GraphQLError("Authentication is required.", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      let input: ShareExperienceInput;
      try {
        input = validateShareExperienceInput(args.input);
      } catch (error) {
        throw new GraphQLError((error as Error).message, {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      try {
        return await getJiraClient().createExperience(input);
      } catch (error) {
        if (error instanceof JiraRequestError) {
          console.error("Jira issue creation failed", {
            status: error.status,
            retryAfter: error.retryAfter,
          });
        } else {
          console.error("Jira integration failed", {
            errorName: error instanceof Error ? error.name : "UnknownError",
            errorMessage: error instanceof Error ? error.message : String(error),
          });
        }
        throw new GraphQLError("Feedback could not be submitted right now.", {
          extensions: { code: "JIRA_UNAVAILABLE" },
        });
      }
    },
  },
}
