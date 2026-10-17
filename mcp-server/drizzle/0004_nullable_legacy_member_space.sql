DO $$ BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'home_space_members' AND column_name = 'home_space_id'
	) THEN
		ALTER TABLE "home_space_members" ALTER COLUMN "home_space_id" DROP NOT NULL;
	END IF;
END $$;
