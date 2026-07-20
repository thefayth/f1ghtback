// Provided by the Cloudflare/vinext runtime as a virtual module.
// @ts-expect-error The project does not ship Cloudflare's ambient type package.
import { env } from "cloudflare:workers";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { NextStepResult } from "@/app/lib/next-step";
import * as schema from "./schema";

export function getDb() {
  const binding = (env as unknown as { DB?: D1Database }).DB;
  if (!binding) {
    return null;
  }

  return drizzle(binding, { schema });
}

export async function storeValidatedNextStep(
  combinationHash: string,
  output: NextStepResult,
): Promise<void> {
  try {
    const db = getDb();
    if (!db) return;

    const now = Date.now();
    await db
      .insert(schema.nextStepOutputs)
      .values({
        combinationHash,
        outputJson: JSON.stringify(output),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: schema.nextStepOutputs.combinationHash,
        set: { outputJson: JSON.stringify(output), updatedAt: now },
      });
  } catch {
    // D1 is optional; the endpoint's safe response must not depend on storage.
  }
}

export async function loadValidatedNextStep(
  combinationHash: string,
): Promise<unknown | null> {
  try {
    const db = getDb();
    if (!db) return null;

    const [row] = await db
      .select({ outputJson: schema.nextStepOutputs.outputJson })
      .from(schema.nextStepOutputs)
      .where(eq(schema.nextStepOutputs.combinationHash, combinationHash))
      .limit(1);
    return row ? JSON.parse(row.outputJson) : null;
  } catch {
    return null;
  }
}

export async function incrementDailyRateCounter(
  counterHash: string,
): Promise<number | null> {
  try {
    const db = getDb();
    if (!db) return null;

    const now = Date.now();
    const [row] = await db
      .insert(schema.nextStepDailyRateCounters)
      .values({ counterHash, requestCount: 1, updatedAt: now })
      .onConflictDoUpdate({
        target: schema.nextStepDailyRateCounters.counterHash,
        set: {
          requestCount: sql`${schema.nextStepDailyRateCounters.requestCount} + 1`,
          updatedAt: now,
        },
      })
      .returning({ requestCount: schema.nextStepDailyRateCounters.requestCount });
    return row?.requestCount ?? null;
  } catch {
    // Missing bindings and transient D1 errors fail open without user content.
    return null;
  }
}
