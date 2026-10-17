import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { homeTodos, homeUsers } from "@/nextsignal/db/schema";
import { getDb } from "@/nextsignal/services/database";
import type { TodoItem } from "@/nextsignal/domain/home";

export type ListTodosInput = {
  spaceId: string;
  assigneeUserId?: string;
  includeCompleted?: boolean;
};

export type AddTodoInput = {
  spaceId: string;
  title: string;
  assigneeUserId: string;
};

export type CompleteTodoInput = {
  spaceId: string;
  id?: string;
  title?: string;
  assigneeUserId?: string;
};

export const todosService = {
  async list(input: ListTodosInput): Promise<TodoItem[]> {
    const db = await getDb();
    const assigneeUserId = normalizeOptionalText(input.assigneeUserId);
    const completionCondition = input.includeCompleted === true ? undefined : isNull(homeTodos.completedAt);
    const assigneeCondition = assigneeUserId ? eq(homeTodos.assigneeUserId, assigneeUserId) : undefined;
    const rows = await db
      .select({
        todo: homeTodos,
        assignee: homeUsers
      })
      .from(homeTodos)
      .innerJoin(homeUsers, eq(homeUsers.id, homeTodos.assigneeUserId))
      .where(and(eq(homeTodos.spaceId, input.spaceId), completionCondition, assigneeCondition))
      .orderBy(sql`${homeTodos.completedAt} ASC NULLS FIRST`, asc(homeTodos.createdAt));

    return rows.map((row) => mapTodo(row.todo, row.assignee));
  },

  async add(input: AddTodoInput): Promise<TodoItem> {
    const db = await getDb();
    const id = crypto.randomUUID();
    const title = input.title.trim();
    const [row] = await db
      .insert(homeTodos)
      .values({ id, spaceId: input.spaceId, title, assigneeUserId: input.assigneeUserId.trim() })
      .returning();

    return hydrateTodo(row);
  },

  async complete(input: CompleteTodoInput): Promise<TodoItem[]> {
    const db = await getDb();
    const id = normalizeOptionalText(input.id);
    const title = normalizeOptionalText(input.title)?.toLowerCase();
    const assigneeUserId = normalizeOptionalText(input.assigneeUserId);
    const matchConditions = [
      id ? eq(homeTodos.id, id) : undefined,
      title ? eq(sql<string>`lower(${homeTodos.title})`, title) : undefined
    ].filter(Boolean);
    const assigneeCondition = assigneeUserId ? eq(homeTodos.assigneeUserId, assigneeUserId) : undefined;
    const rows = await db
      .update(homeTodos)
      .set({ completedAt: new Date() })
      .where(and(eq(homeTodos.spaceId, input.spaceId), isNull(homeTodos.completedAt), or(...matchConditions), assigneeCondition))
      .returning();

    return hydrateTodos(rows);
  }
};

async function hydrateTodo(row: typeof homeTodos.$inferSelect): Promise<TodoItem> {
  const [todo] = await hydrateTodos([row]);
  return todo;
}

async function hydrateTodos(rows: Array<typeof homeTodos.$inferSelect>): Promise<TodoItem[]> {
  if (rows.length === 0) return [];

  const db = await getDb();
  const assigneeUserIds = [...new Set(rows.map((row) => row.assigneeUserId))];
  const users = await db
    .select()
    .from(homeUsers)
    .where(inArray(homeUsers.id, assigneeUserIds));
  const usersById = new Map(users.map((user) => [user.id, user]));

  return rows.map((row) => {
    const assignee = usersById.get(row.assigneeUserId);
    if (!assignee) {
      throw new Error(`Todo assignee user not found: ${row.assigneeUserId}`);
    }

    return mapTodo(row, assignee);
  });
}

function mapTodo(
  row: typeof homeTodos.$inferSelect,
  assignee: typeof homeUsers.$inferSelect
): TodoItem {
  return {
    id: row.id,
    spaceId: row.spaceId,
    title: row.title,
    assigneeUserId: row.assigneeUserId,
    assigneeDisplayName: assignee.displayName,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString()
  };
}

function normalizeOptionalText(value: string | undefined) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
