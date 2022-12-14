import { ApolloServer } from "apollo-server";
import { schema } from "./schema";
import { createContext } from "./context";

const app = new ApolloServer({
  schema,
  context: createContext,
});

app
  .listen({
    port: 8080,
  })
  .then(({ url }) => console.log(`Server is running on ${url}`));
