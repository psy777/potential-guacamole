CREATE TABLE "images" (
	"id" text PRIMARY KEY NOT NULL,
	"mime_type" text DEFAULT 'image/jpeg' NOT NULL,
	"data" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "option_sets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"values" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
