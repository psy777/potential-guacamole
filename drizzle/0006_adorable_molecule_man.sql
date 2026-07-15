ALTER TABLE `order_line_items` ADD `variation_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `order_line_items` ADD `note` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `title` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `invoice_message` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `apply_processing_fee` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `processing_fee_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `square_processing_fee_cents` integer;--> statement-breakpoint
ALTER TABLE `settings` ADD `processing_fee_percent` real DEFAULT 0 NOT NULL;