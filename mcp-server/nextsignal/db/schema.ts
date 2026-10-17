import { index, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const homeUsers = pgTable(
  "home_users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    activeSpaceId: text("active_space_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("home_users_active_space_idx").on(table.activeSpaceId)
  ]
);

export const homeSpaces = pgTable(
  "home_spaces",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    inviteCode: text("invite_code").notNull(),
    createdByUserId: text("created_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("home_spaces_invite_code_idx").on(table.inviteCode),
    index("home_spaces_created_by_user_idx").on(table.createdByUserId)
  ]
);

export const homeSpaceMembers = pgTable(
  "home_space_members",
  {
    spaceId: text("space_id").notNull(),
    userId: text("user_id").notNull(),
    role: text("role", { enum: ["owner", "member"] }).notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    primaryKey({ columns: [table.spaceId, table.userId] }),
    index("home_space_members_user_idx").on(table.userId)
  ]
);

export const homeShoppingItems = pgTable(
  "home_shopping_items",
  {
    id: text("id").primaryKey(),
    spaceId: text("space_id").notNull(),
    name: text("name").notNull(),
    quantity: text("quantity").notNull(),
    store: text("store"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("home_shopping_items_space_created_at_idx").on(table.spaceId, table.createdAt),
    index("home_shopping_items_created_at_idx").on(table.createdAt)
  ]
);

export const homeTodos = pgTable(
  "home_todos",
  {
    id: text("id").primaryKey(),
    spaceId: text("space_id").notNull(),
    title: text("title").notNull(),
    assigneeUserId: text("assignee_user_id").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("home_todos_space_open_assignee_idx").on(table.spaceId, table.assigneeUserId, table.completedAt, table.createdAt),
    index("home_todos_open_assignee_idx").on(table.assigneeUserId, table.completedAt, table.createdAt)
  ]
);

export const nextsignalLogs = pgTable(
  "nextsignal_logs",
  {
    id: text("id").primaryKey(),
    level: text("level").notNull(),
    message: text("message").notNull(),
    process: text("process"),
    correlationId: text("correlation_id"),
    data: jsonb("data"),
    error: jsonb("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("nextsignal_logs_created_at_idx").on(table.createdAt),
    index("nextsignal_logs_correlation_id_idx").on(table.correlationId)
  ]
);

export const marketplaceNotificationSignups = pgTable(
  "marketplace_notification_signups",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("marketplace_notification_signups_email_idx").on(table.email)
  ]
);
