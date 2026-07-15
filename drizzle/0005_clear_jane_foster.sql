ALTER TABLE `item_variations` ADD `square_variation_id` text;--> statement-breakpoint
ALTER TABLE `items` ADD `square_catalog_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `items_square_uq` ON `items` (`square_catalog_id`);