import { rule, shield } from "graphql-shield";
import { getUserId } from "../utils";
import { Context } from "../context";

const rules = {
  // not being used
  isAuthenticatedUser: rule()((_parent, _args, context) => {
    const userId = getUserId(context);
    return Boolean(userId);
  }),

  isTaskOwner: rule()(async (_parent, { id }, context: Context) => {
    const ownerId = Number(getUserId(context));

    const task = await context.prisma.task.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    return ownerId === task.ownerId;
  }),

  allow: rule()((_parent, _args, _context) => true),
};

export const permissions = shield(
  {
    Query: {
      tasks: rules.isAuthenticatedUser,
    },
    Mutation: {
      signup: rules.allow,
      login: rules.allow,
      createTask: rules.isAuthenticatedUser,
      updateTask: rules.isTaskOwner,
      deleteTask: rules.isTaskOwner,
    },
  },
  {
    debug: true,
  }
);
