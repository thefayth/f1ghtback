// Provided by the Cloudflare/vinext runtime as a virtual module.
// @ts-expect-error The project does not ship Cloudflare's ambient type package.
import { env } from "cloudflare:workers";
import { incrementDailyRateCounter } from "@/db";
import { dailyRateCounterHash } from "@/app/lib/next-step";
import { handleTranscriptReviewRequest } from "@/app/lib/transcript-review";

type TranscriptRuntimeEnv = {
  OPENAI_API_KEY?: string;
  NEXT_STEP_RATE_SALT?: string;
};

const DAILY_TRANSCRIPT_REQUEST_LIMIT = 12;

export async function POST(request: Request): Promise<Response> {
  const runtimeEnv = env as unknown as TranscriptRuntimeEnv;
  const apiKey = runtimeEnv.OPENAI_API_KEY?.trim();
  const rateSalt = runtimeEnv.NEXT_STEP_RATE_SALT?.trim() || apiKey;
  const clientAddress = request.headers.get("cf-connecting-ip");
  let modelRequestAllowed = true;

  if (apiKey && rateSalt && clientAddress) {
    try {
      const counterHash = await dailyRateCounterHash(
        clientAddress,
        `${rateSalt}:transcript-review`,
      );
      const count = await incrementDailyRateCounter(counterHash);
      if (count !== null && count > DAILY_TRANSCRIPT_REQUEST_LIMIT) {
        modelRequestAllowed = false;
      }
    } catch {
      // Storage is optional; the deterministic path remains available.
    }
  }

  return handleTranscriptReviewRequest(request, { apiKey, modelRequestAllowed });
}
