import {
  asNexusMethod,
  intArg,
  makeSchema,
  nonNull,
  nullable,
  objectType,
  stringArg,
} from "nexus";
import { applyMiddleware } from "graphql-middleware";
import { permissions } from "./permissions";
import { DateTimeResolver } from "graphql-scalars";
import { Context } from "./context";
import { compare, hash } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { getUserId } from "./utils";

export const DateTime = asNexusMethod(DateTimeResolver, "date");

const Query = objectType({
  name: "Query",
  definition(t) {
    t.nonNull.list.nonNull.field("tasks", {
      type: "Task",
      resolve(_parent, _args, ctx: Context) {
        const ownerId = Number(getUserId(ctx));
        return ctx.prisma.task.findMany({
          where: {
            ownerId,
          },
        });
      },
    });
  },
});

const AuthPayload = objectType({
  name: "AuthPayload",
  definition(t) {
    t.nonNull.string("token");
    t.nonNull.field("user", { type: "User" });
  },
});

const Mutation = objectType({
  name: "Mutation",
  definition(t) {
    t.field("signup", {
      type: "AuthPayload",
      args: {
        name: stringArg(),
        email: nonNull(stringArg()),
        password: nonNull(stringArg()),
      },
      resolve: async (_parent, { name, email, password }, ctx: Context) => {
        const hashedPassword = await hash(password, 10);
        const user = await ctx.prisma.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
          },
        });

        return {
          token: sign({ userId: user.id }, process.env.APP_SECRET),
          user,
        };
      },
    });

    t.field("login", {
      type: "AuthPayload",
      args: {
        email: nonNull(stringArg()),
        password: nonNull(stringArg()),
      },
      resolve: async (_parent, { email, password }, ctx: Context) => {
        const user = await ctx.prisma.user.findUnique({
          where: {
            email,
          },
        });

        if (!user) throw new Error(`No such user found for email: ${email}`);

        const valid = await compare(password, user.password);
        if (!valid) throw new Error("Invalid password");

        return {
          token: sign({ userId: user.id }, process.env.APP_SECRET),
          user,
        };
      },
    });

    t.field("createTask", {
      type: "Task",
      args: {
        title: nonNull(stringArg()),
        description: stringArg(),
      },
      resolve: async (_parent, { title, description }, ctx: Context) => {
        const ownerId = Number(getUserId(ctx));
        return ctx.prisma.task.create({
          data: {
            title,
            description,
            state: 0,
            owner: {
              connect: {
                id: ownerId,
              },
            },
          },
        });
      },
    });

    t.field("updateTask", {
      type: "Task",
      args: {
        id: nonNull(intArg()),
        title: nullable(stringArg()),
        description: nullable(stringArg()),
        state: nullable(intArg()),
      },
      resolve: async (
        _parent,
        { id, title, description, state },
        ctx: Context
      ) => {
        return ctx.prisma.task.update({
          where: {
            id: Number(id),
          },
          data: {
            title,
            description,
            state,
          },
        });
      },
    });

    t.field("deleteTask", {
      type: "Boolean",
      args: {
        id: nonNull(intArg()),
      },
      resolve: async (_parent, { id }, ctx: Context) => {
        ctx.prisma.task.delete({
          where: {
            id: Number(id),
          },
        });

        return true;
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
    t.nonNull.int("state");
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
  types: [DateTime, Query, Mutation, User, Task, AuthPayload],
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
