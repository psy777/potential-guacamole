CREATE TABLE "contact_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"contact_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wholesale_cart_items" (
	"id" text PRIMARY KEY NOT NULL,
	"contact_id" text NOT NULL,
	"item_id" text NOT NULL,
	"variation_id" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "wholesale_cart_uq" UNIQUE("contact_id","variation_id")
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "portal_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "wholesale_discount_percent" real;--> statement-breakpoint
ALTER TABLE "item_variations" ADD COLUMN "wholesale_price_cents" integer;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "wholesale_discount_percent" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_sessions" ADD CONSTRAINT "contact_sessions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wholesale_cart_items" ADD CONSTRAINT "wholesale_cart_items_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wholesale_cart_items" ADD CONSTRAINT "wholesale_cart_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wholesale_cart_items" ADD CONSTRAINT "wholesale_cart_items_variation_id_item_variations_id_fk" FOREIGN KEY ("variation_id") REFERENCES "public"."item_variations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wholesale_cart_contact_idx" ON "wholesale_cart_items" USING btree ("contact_id");