CREATE TABLE IF NOT EXISTS "home_users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"active_space_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "home_shopping_items" ADD COLUMN IF NOT EXISTS "space_id" text DEFAULT 'legacy-space' NOT NULL;
--> statement-breakpoint
ALTER TABLE "home_shopping_items" ALTER COLUMN "space_id" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "home_todos" ADD COLUMN IF NOT EXISTS "space_id" text DEFAULT 'legacy-space' NOT NULL;
--> statement-breakpoint
ALTER TABLE "home_todos" ALTER COLUMN "space_id" DROP DEFAULT;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "home_users_active_space_idx" ON "home_users" USING btree ("active_space_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "home_shopping_items_space_created_at_idx" ON "home_shopping_items" USING btree ("space_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "home_todos_space_open_assignee_idx" ON "home_todos" USING btree ("space_id","assignee","completed_at","created_at");
