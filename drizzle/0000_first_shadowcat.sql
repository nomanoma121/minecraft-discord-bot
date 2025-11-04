CREATE TABLE `servers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_id` text NOT NULL,
	`version` text NOT NULL,
	`max_players` integer NOT NULL,
	`difficulty` text NOT NULL,
	`type` text NOT NULL,
	`gamemode` text NOT NULL,
	`description` text NOT NULL,
	`created_at` text DEFAULT current_timestamp NOT NULL,
	`updated_at` text DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `servers_name_unique` ON `servers` (`name`);