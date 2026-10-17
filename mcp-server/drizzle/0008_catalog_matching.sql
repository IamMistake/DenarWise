CREATE TABLE "catalog_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_offers" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"offer" jsonb NOT NULL,
	"evidence" jsonb,
	"retrieved_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_products" (
	"id" text PRIMARY KEY NOT NULL,
	"product" jsonb NOT NULL,
	"refreshed_at" timestamp with time zone,
	"incomplete" text DEFAULT 'true' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopping_confirmations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"request_id" text NOT NULL,
	"payload_hash" text NOT NULL,
	"item_ids" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "home_shopping_items" ADD COLUMN "product_id" text;--> statement-breakpoint
ALTER TABLE "home_shopping_items" ADD COLUMN "original_query" text;--> statement-breakpoint
ALTER TABLE "home_shopping_items" ADD COLUMN "keywords" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog_offers" ADD CONSTRAINT "catalog_offers_product_id_catalog_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."catalog_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_cache_expiry_idx" ON "catalog_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "catalog_offers_product_idx" ON "catalog_offers" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shopping_confirmation_request_idx" ON "shopping_confirmations" USING btree ("user_id","request_id");--> statement-breakpoint
ALTER TABLE "home_shopping_items" ADD CONSTRAINT "home_shopping_items_product_id_catalog_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."catalog_products"("id") ON DELETE no action ON UPDATE no action;