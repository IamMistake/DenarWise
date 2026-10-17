DELETE FROM "home_todos";
--> statement-breakpoint
DROP INDEX IF EXISTS "home_todos_space_open_assignee_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "home_todos_open_assignee_idx";
--> statement-breakpoint
ALTER TABLE "home_todos" DROP COLUMN IF EXISTS "assignee";
--> statement-breakpoint
ALTER TABLE "home_todos" ADD COLUMN "assignee_user_id" text NOT NULL;
--> statement-breakpoint
CREATE INDEX "home_todos_space_open_assignee_idx" ON "home_todos" USING btree ("space_id","assignee_user_id","completed_at","created_at");
--> statement-breakpoint
CREATE INDEX "home_todos_open_assignee_idx" ON "home_todos" USING btree ("assignee_user_id","completed_at","created_at");
