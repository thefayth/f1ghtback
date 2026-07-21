// Provided by the Cloudflare/vinext runtime as a virtual module.
// @ts-expect-error The project does not ship Cloudflare's ambient type package.
import { env } from "cloudflare:workers";
import {
  incrementDailyRateCounter,
  loadValidatedNextStep,
  storeValidatedNextStep,
} from "@/db";
import { handleNextStepRequest } from "@/app/lib/next-step";

type NextStepRuntimeEnv = {
  OPENAI_API_KEY?: string;
};

export async function POST(request: Request): Promise<Response> {
  const runtimeEnv = env as unknown as NextStepRuntimeEnv;
  const apiKey = runtimeEnv.OPENAI_API_KEY?.trim();

  return handleNextStepRequest(request, {
    apiKey,
    rateScope: "next-step",
    persistResult: storeValidatedNextStep,
    loadCachedResult: loadValidatedNextStep,
    incrementRateCounter: incrementDailyRateCounter,
  });
}
