CREATE TABLE "add_ons" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_add_ons" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"add_on_id" text NOT NULL,
	CONSTRAINT "item_add_ons_uq" UNIQUE("item_id","add_on_id")
);
--> statement-breakpoint
ALTER TABLE "item_add_ons" ADD CONSTRAINT "item_add_ons_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_add_ons" ADD CONSTRAINT "item_add_ons_add_on_id_add_ons_id_fk" FOREIGN KEY ("add_on_id") REFERENCES "public"."add_ons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "item_add_ons_item_idx" ON "item_add_ons" USING btree ("item_id");