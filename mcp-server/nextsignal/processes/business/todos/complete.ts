import { businessProcess, forwardFault, notFound, requireUser, validateWith, value } from "@gotch/nextsignal";
import type { ProcessContext } from "@gotch/nextsignal";
import { requireHomeSpace } from "@/nextsignal/processes/business/context";
import type { AppServices } from "@/nextsignal/services";
import { todoCompleteInputSchema, type TodoCompleteInput } from "@/nextsignal/schemas";
import type { ActiveHomeSpace, HomeChangeNotification, TodoItem } from "@/nextsignal/domain/home";

export type TodoCompleteOutput = {
  completedTodos: TodoItem[];
  todos: TodoItem[];
};

export const todoComplete = businessProcess<TodoCompleteInput, TodoCompleteOutput, AppServices>({
  name: "todos.complete",
  metadata: {
    description: "Completes todos by id or title and notifies the requested home space.",
    tags: ["todos", "business"],
    owner: "home",
    version: "0.1.0"
  },
  auth: requireUser(),
  validate: validateWith(todoCompleteInputSchema),
  handle: todoCompleteHandle
});

async function todoCompleteHandle(ctx: ProcessContext<AppServices>, input: TodoCompleteInput) {
  const spaceResult = await requireHomeSpace(ctx, input.spaceId);
  if (!spaceResult.ok) return forwardFault(spaceResult);
  const activeSpace = spaceResult.data!;

  await ctx.logger.info({
    message: "Completing todos.",
    process: ctx.metadata.processName,
    correlationId: ctx.metadata.correlationId,
    data: {
      byId: Boolean(input.id),
      byTitle: Boolean(input.title),
      assigneeUserId: input.assigneeUserId,
      spaceId: input.spaceId,
      userId: activeSpace.user.id
    }
  });

  const completedTodos = await ctx.services.todos.complete(input);
  if (completedTodos.length === 0) {
    await ctx.logger.warn({
      message: "No open todos matched completion request.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: {
        byId: Boolean(input.id),
        byTitle: Boolean(input.title),
        assigneeUserId: input.assigneeUserId,
        spaceId: input.spaceId
      }
    });

    return notFound("No open todos matched the completion request.");
  }

  const todos = await ctx.services.todos.list({ spaceId: input.spaceId });
  const recipients = await ctx.services.spaces.listNotificationMembers({
    spaceId: input.spaceId,
    excludeUserId: activeSpace.user.id
  });
  ctx.services.email.sendSpaceChangeNotificationAsync(
    createTodoCompleteNotification(activeSpace, { completedTodos, todos }),
    recipients,
    ctx.logger
  );

  await ctx.logger.info({
    message: "Todos completed.",
    process: ctx.metadata.processName,
    correlationId: ctx.metadata.correlationId,
    data: {
      completedCount: completedTodos.length,
      todoCount: todos.length,
      spaceId: input.spaceId
    }
  });

  return value({ completedTodos, todos });
}

function createTodoCompleteNotification(
  activeSpace: ActiveHomeSpace,
  data: TodoCompleteOutput
): HomeChangeNotification {
  const count = data.completedTodos.length;

  return {
    domain: "todos",
    action: "complete",
    spaceName: activeSpace.space.name,
    changedBy: activeSpace.user.displayName,
    summary: `${activeSpace.user.displayName} completed ${count} todo${count === 1 ? "" : "s"}.`,
    details: data.completedTodos.map((todo) => `${todo.title} (${todo.assigneeDisplayName})`),
    snapshot: {
      todos: data.todos
    },
    changedAt: new Date().toISOString()
  };
}
