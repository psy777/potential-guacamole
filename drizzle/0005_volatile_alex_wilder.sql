CREATE TABLE "order_line_add_ons" (
	"id" text PRIMARY KEY NOT NULL,
	"order_line_item_id" text NOT NULL,
	"add_on_id" text,
	"name" text NOT NULL,
	"price_cents" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wholesale_cart_items" DROP CONSTRAINT "wholesale_cart_uq";--> statement-breakpoint
ALTER TABLE "wholesale_cart_items" ADD COLUMN "add_on_ids" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_line_add_ons" ADD CONSTRAINT "order_line_add_ons_order_line_item_id_order_line_items_id_fk" FOREIGN KEY ("order_line_item_id") REFERENCES "public"."order_line_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_add_ons" ADD CONSTRAINT "order_line_add_ons_add_on_id_add_ons_id_fk" FOREIGN KEY ("add_on_id") REFERENCES "public"."add_ons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_line_add_ons_line_idx" ON "order_line_add_ons" USING btree ("order_line_item_id");--> statement-breakpoint
ALTER TABLE "wholesale_cart_items" ADD CONSTRAINT "wholesale_cart_uq" UNIQUE("contact_id","variation_id","add_on_ids");