CREATE TABLE `next_step_daily_rate_counters` (
	`counter_hash` text PRIMARY KEY NOT NULL,
	`request_count` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `next_step_outputs` (
	`combination_hash` text PRIMARY KEY NOT NULL,
	`output_json` text NOT NULL,
	`updated_at` integer NOT NULL
);
