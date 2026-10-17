DROP INDEX IF EXISTS "home_shopping_items_home_space_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "home_todos_home_space_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "home_space_members_clerk_user_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "home_space_members_home_space_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "home_space_members_space_user_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "home_space_members_space_user_workos_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "home_spaces_created_by_clerk_user_id_idx";
--> statement-breakpoint
ALTER TABLE "home_shopping_items" DROP COLUMN IF EXISTS "home_space_id";
--> statement-breakpoint
ALTER TABLE "home_todos" DROP COLUMN IF EXISTS "home_space_id";
--> statement-breakpoint
ALTER TABLE "home_spaces" DROP COLUMN IF EXISTS "created_by_clerk_user_id";
--> statement-breakpoint
ALTER TABLE "home_spaces" DROP COLUMN IF EXISTS "updated_at";
--> statement-breakpoint
ALTER TABLE "home_space_members" DROP COLUMN IF EXISTS "id";
--> statement-breakpoint
ALTER TABLE "home_space_members" DROP COLUMN IF EXISTS "home_space_id";
--> statement-breakpoint
ALTER TABLE "home_space_members" DROP COLUMN IF EXISTS "clerk_user_id";
--> statement-breakpoint
ALTER TABLE "home_space_members" DROP COLUMN IF EXISTS "email";
--> statement-breakpoint
ALTER TABLE "home_space_members" DROP COLUMN IF EXISTS "display_name";
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'home_space_members_space_id_user_id_pk'
	) THEN
		ALTER TABLE "home_space_members"
		ADD CONSTRAINT "home_space_members_space_id_user_id_pk" PRIMARY KEY ("space_id","user_id");
	END IF;
END $$;
