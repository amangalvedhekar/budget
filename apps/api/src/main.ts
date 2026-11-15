import {ApolloServer} from "@apollo/server";
import {startStandaloneServer} from "@apollo/server/standalone";
import {readFileSync} from "fs";
import path from "path";
import gql from "graphql-tag";
import {resolvers, type GraphContext} from "./resolvers";

const typeDefs = gql(
  readFileSync(path.resolve(__dirname, "./schema.graphql"), {
    encoding: "utf-8",
  })
);

async function startApolloServer() {
  const server = new ApolloServer<GraphContext>({
    typeDefs,
    resolvers,
  });

  const { url } = await startStandaloneServer(server, {
    context: async () => ({ userSub: "local-development" }),
    listen: {
      port: 4000,
    }
  });
  console.log(`Starting Apollo server...${url}`);
}

startApolloServer().catch(console.error);
