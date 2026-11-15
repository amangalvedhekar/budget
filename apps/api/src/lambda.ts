import { ApolloServer } from "@apollo/server";
import {
  startServerAndCreateLambdaHandler,
  handlers,
} from "@as-integrations/aws-lambda";
import gql from "graphql-tag";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

import schema from "./schema.graphql";
import { resolvers, type GraphContext } from "./resolvers";

const server = new ApolloServer<GraphContext>({
  typeDefs: gql(schema),
  resolvers,
});

export const handler = startServerAndCreateLambdaHandler(
  server,
  handlers.createAPIGatewayProxyEventV2RequestHandler<APIGatewayProxyEventV2WithJWTAuthorizer>(),
  {
    context: async ({ event }) => {
      const sub = event.requestContext.authorizer?.jwt?.claims?.sub;
      return { userSub: typeof sub === "string" ? sub : "" };
    },
  }
);
