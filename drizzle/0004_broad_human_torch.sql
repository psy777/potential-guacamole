PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`contact_id` text,
	`status` text DEFAULT 'open' NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`subtotal_cents` integer DEFAULT 0 NOT NULL,
	`discount_cents` integer DEFAULT 0 NOT NULL,
	`tax_cents` integer DEFAULT 0 NOT NULL,
	`shipping_cents` integer DEFAULT 0 NOT NULL,
	`total_cents` integer DEFAULT 0 NOT NULL,
	`amount_paid_cents` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`due_date` integer,
	`stripe_checkout_id` text,
	`square_payment_link_id` text,
	`square_order_id` text,
	`payment_link_url` text,
	`payment_link_provider` text,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_orders`("id", "number", "contact_id", "status", "currency", "subtotal_cents", "discount_cents", "tax_cents", "shipping_cents", "total_cents", "amount_paid_cents", "notes", "due_date", "stripe_checkout_id", "square_payment_link_id", "square_order_id", "payment_link_url", "payment_link_provider", "created_by", "created_at", "updated_at") SELECT "id", "number", "contact_id", "status", "currency", "subtotal_cents", "discount_cents", "tax_cents", "shipping_cents", "total_cents", "amount_paid_cents", "notes", "due_date", "stripe_checkout_id", "square_payment_link_id", "square_order_id", "payment_link_url", "payment_link_provider", "created_by", "created_at", "updated_at" FROM `orders`;--> statement-breakpoint
DROP TABLE `orders`;--> statement-breakpoint
ALTER TABLE `__new_orders` RENAME TO `orders`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `orders_number_unique` ON `orders` (`number`);--> statement-breakpoint
CREATE INDEX `orders_contact_idx` ON `orders` (`contact_id`);--> statement-breakpoint
UPDATE `orders` SET `status` = 'open' WHERE `status` = 'draft';--> statement-breakpoint
UPDATE `orders` SET `status` = 'invoiced' WHERE `status` = 'sent';--> statement-breakpoint
UPDATE `order_status_history` SET `status` = 'open' WHERE `status` = 'draft';--> statement-breakpoint
UPDATE `order_status_history` SET `status` = 'invoiced' WHERE `status` = 'sent';