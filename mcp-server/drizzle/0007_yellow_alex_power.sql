CREATE TABLE "marketplace_notification_signups" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_notification_signups_email_idx" ON "marketplace_notification_signups" USING btree ("email");
