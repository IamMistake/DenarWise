CREATE TABLE IF NOT EXISTS "home_shopping_items" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "quantity" text NOT NULL,
  "store" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "home_shopping_items_created_at_idx"
ON "home_shopping_items" ("created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "home_todos" (
  "id" text PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "assignee" text NOT NULL,
  "completed_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "home_todos_open_assignee_idx"
ON "home_todos" ("assignee", "completed_at", "created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nextsignal_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "level" text NOT NULL,
  "message" text NOT NULL,
  "process" text,
  "correlation_id" text,
  "data" jsonb,
  "error" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nextsignal_logs_created_at_idx"
ON "nextsignal_logs" ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nextsignal_logs_correlation_id_idx"
ON "nextsignal_logs" ("correlation_id");
