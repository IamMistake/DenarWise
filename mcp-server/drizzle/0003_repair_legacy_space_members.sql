ALTER TABLE "home_spaces" ADD COLUMN IF NOT EXISTS "created_by_user_id" text;
--> statement-breakpoint
DO $$ BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'home_spaces' AND column_name = 'created_by_clerk_user_id'
	) THEN
		UPDATE "home_spaces"
		SET "created_by_user_id" = "created_by_clerk_user_id"
		WHERE "created_by_user_id" IS NULL;

		ALTER TABLE "home_spaces" ALTER COLUMN "created_by_clerk_user_id" DROP NOT NULL;
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "home_spaces" ALTER COLUMN "created_by_user_id" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "home_spaces_created_by_user_idx" ON "home_spaces" USING btree ("created_by_user_id");
--> statement-breakpoint
ALTER TABLE "home_space_members" ADD COLUMN IF NOT EXISTS "space_id" text;
--> statement-breakpoint
ALTER TABLE "home_space_members" ADD COLUMN IF NOT EXISTS "user_id" text;
--> statement-breakpoint
DO $$ BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'home_space_members' AND column_name = 'home_space_id'
	) THEN
		UPDATE "home_space_members"
		SET "space_id" = "home_space_id"
		WHERE "space_id" IS NULL;
	END IF;

	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'home_space_members' AND column_name = 'clerk_user_id'
	) THEN
		UPDATE "home_space_members"
		SET "user_id" = "clerk_user_id"
		WHERE "user_id" IS NULL;

		ALTER TABLE "home_space_members" ALTER COLUMN "clerk_user_id" DROP NOT NULL;
	END IF;

	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'home_space_members' AND column_name = 'id'
	) THEN
		ALTER TABLE "home_space_members" DROP CONSTRAINT IF EXISTS "home_space_members_pkey";
		ALTER TABLE "home_space_members" ALTER COLUMN "id" DROP NOT NULL;
	END IF;

	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'home_space_members' AND column_name = 'email'
	) THEN
		ALTER TABLE "home_space_members" ALTER COLUMN "email" DROP NOT NULL;
	END IF;

	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'home_space_members' AND column_name = 'display_name'
	) THEN
		ALTER TABLE "home_space_members" ALTER COLUMN "display_name" DROP NOT NULL;
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "home_space_members" ALTER COLUMN "space_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "home_space_members" ALTER COLUMN "user_id" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "home_space_members_user_idx" ON "home_space_members" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "home_space_members_space_user_workos_idx" ON "home_space_members" USING btree ("space_id","user_id");
