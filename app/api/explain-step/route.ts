// Provided by the Cloudflare/vinext runtime as a virtual module.
// @ts-expect-error The project does not ship Cloudflare's ambient type package.
import { env } from "cloudflare:workers";
import {
  incrementDailyRateCounter,
  loadValidatedOutput,
  storeValidatedOutput,
} from "@/db";
import {
  globalDailyRateCounterKey,
} from "@/app/lib/next-step";
import { handleExplainStepRequest } from "@/app/lib/explain-step";

type ExplainRuntimeEnv = {
  OPENAI_API_KEY?: string;
};

const DAILY_EXPLAIN_REQUEST_LIMIT = 20;

export async function POST(request: Request): Promise<Response> {
  const apiKey = (env as unknown as ExplainRuntimeEnv).OPENAI_API_KEY?.trim();
  let modelRequestAllowed = true;

  if (apiKey) {
    try {
      const counterKey = await globalDailyRateCounterKey("explain-step");
      const count = await incrementDailyRateCounter(counterKey);
      if (count !== null && count > DAILY_EXPLAIN_REQUEST_LIMIT) modelRequestAllowed = false;
    } catch {
      // The deterministic explanation remains available.
    }
  }

  return handleExplainStepRequest(request, {
    apiKey,
    modelRequestAllowed,
    loadCachedResult: loadValidatedOutput,
    persistResult: storeValidatedOutput,
  });
}
