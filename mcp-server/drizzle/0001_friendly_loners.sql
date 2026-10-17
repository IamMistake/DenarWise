CREATE TABLE "home_space_members" (
	"space_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "home_space_members_space_id_user_id_pk" PRIMARY KEY("space_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "home_spaces" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"invite_code" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "home_users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"active_space_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "home_shopping_items" ADD COLUMN "space_id" text DEFAULT 'legacy-space' NOT NULL;--> statement-breakpoint
ALTER TABLE "home_shopping_items" ALTER COLUMN "space_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "home_todos" ADD COLUMN "space_id" text DEFAULT 'legacy-space' NOT NULL;--> statement-breakpoint
ALTER TABLE "home_todos" ALTER COLUMN "space_id" DROP DEFAULT;--> statement-breakpoint
CREATE INDEX "home_space_members_user_idx" ON "home_space_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "home_spaces_invite_code_idx" ON "home_spaces" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "home_spaces_created_by_user_idx" ON "home_spaces" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "home_users_active_space_idx" ON "home_users" USING btree ("active_space_id");--> statement-breakpoint
CREATE INDEX "home_shopping_items_space_created_at_idx" ON "home_shopping_items" USING btree ("space_id","created_at");--> statement-breakpoint
CREATE INDEX "home_todos_space_open_assignee_idx" ON "home_todos" USING btree ("space_id","assignee","completed_at","created_at");
