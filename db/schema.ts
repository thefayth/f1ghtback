import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

declare global {
  interface D1Database {
    prepare(query: string): unknown;
    batch(statements: unknown[]): Promise<unknown[]>;
    exec(query: string): Promise<unknown>;
    dump(): Promise<ArrayBuffer>;
  }

  interface Fetcher {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  }
}

export const nextStepOutputs = sqliteTable("next_step_outputs", {
  combinationHash: text("combination_hash").primaryKey(),
  outputJson: text("output_json").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const nextStepDailyRateCounters = sqliteTable(
  "next_step_daily_rate_counters",
  {
    counterHash: text("counter_hash").primaryKey(),
    requestCount: integer("request_count").notNull().default(1),
    updatedAt: integer("updated_at").notNull(),
  },
);
