import { ApolloServer } from "@apollo/server";
import {
  startServerAndCreateLambdaHandler,
  handlers,
} from "@as-integrations/aws-lambda";
import gql from "graphql-tag";

import schema from "./schema.graphql";
import { resolvers } from "./resolvers";

const server = new ApolloServer({
  typeDefs: gql(schema),
  resolvers,
});

export const handler = startServerAndCreateLambdaHandler(
  server,
  handlers.createAPIGatewayProxyEventV2RequestHandler()
);
