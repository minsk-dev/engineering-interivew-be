import { ApolloServer } from "apollo-server";
import { schema } from "./schema";
import { createContext } from "./context";

if (!process.env.APP_SECRET || process.env.APP_SECRET === "") {
  throw new Error("$APP_SECRET is not defined");
}

const app = new ApolloServer({
  schema,
  context: createContext,
});

app
  .listen({
    port: 8080,
  })
  .then(({ url }) => console.log(`Server is running on ${url}`));
