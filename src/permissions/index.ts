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
    const userId = getUserId(context);
    const owner = await context.prisma.task.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    return Number(userId) === owner.ownerId;
  }),
};

export const permissions = shield({
  Query: {
    tasks: rules.isTaskOwner,
  },
});
