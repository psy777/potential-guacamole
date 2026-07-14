CREATE TABLE `item_variations` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`name` text DEFAULT 'Regular' NOT NULL,
	`sku` text DEFAULT '' NOT NULL,
	`gtin` text DEFAULT '' NOT NULL,
	`price_cents` integer DEFAULT 0 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `item_variations_item_idx` ON `item_variations` (`item_id`);--> statement-breakpoint
ALTER TABLE `items` ADD `category` text DEFAULT '' NOT NULL;