import { asNexusMethod, makeSchema, objectType } from "nexus";
import { applyMiddleware } from "graphql-middleware";
import { PrismaClient } from "@prisma/client";
import { permissions } from "./permissions";
import { DateTimeResolver } from "graphql-scalars";
import { Context } from "./context";

export const DateTime = asNexusMethod(DateTimeResolver, "date");

const Query = objectType({
  name: "Query",
  definition(t) {
    t.nonNull.list.nonNull.field("tasks", {
      type: "Task",
      resolve(_parent, { id }, ctx: Context) {
        return (ctx.prisma as PrismaClient).task.findMany({
          where: {
            ownerId: id,
          },
        });
      },
    });
  },
});

const User = objectType({
  name: "User",
  definition(t) {
    t.nonNull.int("id");
    t.nonNull.string("email");
    t.nonNull.string("password");
    t.nonNull.string("name");
    t.nonNull.list.nonNull.field("tasks", {
      type: "Task",
      resolve(parent, _args, ctx) {
        return ctx.prisma.post.findMany({
          where: {
            authorId: parent.id,
          },
        });
      },
    });
  },
});

const Task = objectType({
  name: "Task",
  definition(t) {
    t.nonNull.int("id");
    t.nonNull.field("createdAt", { type: "DateTime" });
    t.nonNull.field("updatedAt", { type: "DateTime" });
    t.nonNull.string("title");
    t.nonNull.string("description");
    t.nonNull.field("owner", {
      type: "User",
      resolve(parent, { id }, ctx: Context) {
        return ctx.prisma.user.findUnique({
          where: {
            id,
          },
        });
      },
    });
  },
});

const schemaWithoutPermissions = makeSchema({
  types: [DateTime, Query, User, Task],
  outputs: {
    schema: __dirname + "/../schema.graphql",
    typegen: __dirname + "/generated/nexus.ts",
  },
  contextType: {
    module: require.resolve("./context"),
    export: "Context",
  },
  sourceTypes: {
    modules: [
      {
        module: "@prisma/client",
        alias: "prisma",
      },
    ],
  },
});

export const schema = applyMiddleware(schemaWithoutPermissions, permissions);
