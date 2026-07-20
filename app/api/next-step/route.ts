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
  NEXT_STEP_RATE_SALT?: string;
};

export async function POST(request: Request): Promise<Response> {
  const runtimeEnv = env as unknown as NextStepRuntimeEnv;
  const apiKey = runtimeEnv.OPENAI_API_KEY?.trim();
  const rateSalt = runtimeEnv.NEXT_STEP_RATE_SALT?.trim() || apiKey;

  return handleNextStepRequest(request, {
    apiKey,
    rateSalt,
    clientAddress: request.headers.get("cf-connecting-ip"),
    persistResult: storeValidatedNextStep,
    loadCachedResult: loadValidatedNextStep,
    incrementRateCounter: incrementDailyRateCounter,
  });
}
