CREATE TABLE `closet_shares` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`member_id` text,
	`invite_email` text,
	`invite_token` text,
	`role` text DEFAULT 'stylist' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`accepted_at` integer,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `closet_shares_invite_token_unique` ON `closet_shares` (`invite_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `closet_shares_owner_member` ON `closet_shares` (`owner_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`category` text DEFAULT 'uncategorized' NOT NULL,
	`subcategory` text,
	`colors` text DEFAULT '[]' NOT NULL,
	`colors_confirmed` integer DEFAULT false NOT NULL,
	`pattern` text,
	`styles` text DEFAULT '[]' NOT NULL,
	`warmth` text DEFAULT '[]' NOT NULL,
	`formality` text,
	`brand` text,
	`size` text,
	`notes` text,
	`laundry` text DEFAULT 'clean' NOT NULL,
	`favorite` integer DEFAULT false NOT NULL,
	`wear_count` integer DEFAULT 0 NOT NULL,
	`last_worn_at` integer,
	`has_cutout` integer DEFAULT false NOT NULL,
	`bg_status` text DEFAULT 'pending' NOT NULL,
	`bg_error` text,
	`image_version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `items_owner_idx` ON `items` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `items_bg_idx` ON `items` (`bg_status`);--> statement-breakpoint
CREATE TABLE `outfit_items` (
	`outfit_id` text NOT NULL,
	`item_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`outfit_id`, `item_id`),
	FOREIGN KEY (`outfit_id`) REFERENCES `outfits`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `outfits` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`created_by_id` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`occasion` text,
	`notes` text,
	`context` text,
	`planned_for` text,
	`worn_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `outfits_owner_idx` ON `outfits` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);