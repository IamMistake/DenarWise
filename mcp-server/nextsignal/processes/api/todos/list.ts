import { apiProcess, forwardFault, requireUser, validateWith, value } from "@gotch/nextsignal";
import { requireSpace } from "@/nextsignal/processes/business/context";
import type { AppServices } from "@/nextsignal/services";
import { todoListInputSchema, type TodoListInput } from "@/nextsignal/schemas";
import type { TodoItem } from "@/nextsignal/domain/home";

export const todoListApi = apiProcess<TodoListInput, TodoItem[], AppServices>({
  name: "todos.list",
  metadata: {
    description: "Lists todos in the requested space, optionally scoped to an assignee user id.",
    tags: ["todos", "api"],
    owner: "home",
    version: "0.1.0"
  },
  auth: requireUser(),
  validate: validateWith(todoListInputSchema),
  async handle(ctx, input) {
    const spaceResult = await requireSpace(ctx, input.spaceId);
    if (!spaceResult.ok) return forwardFault(spaceResult);

    const todos = await ctx.services.todos.list({
      ...input
    });
    await ctx.logger.info({
      message: "Listed todos.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: {
        spaceId: input.spaceId,
        todoCount: todos.length
      }
    });

    return value(todos);
  }
});
