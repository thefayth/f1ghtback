import {
  GUIDE_DETAIL_LEVELS,
  GUIDE_IDS,
  getGuidePack,
  getGuideStep,
  isGuidePackStale,
  type GuideDetailLevel,
  type GuideId,
} from "./guide-packs.ts";
import { sourceList, type SourceId } from "./source-manifest.ts";

export type ExplainStepInput = {
  guideId: GuideId;
  stepId: string;
  detailLevel: GuideDetailLevel;
};

export type ExplainStepResult = {
  mode: "gpt-5.6" | "source-only";
  explanation: string;
  whyItMatters: string;
  watchFor: string[];
  sourceIds: SourceId[];
  sourcePackStatus: "current" | "stale";
  humanReviewRequired: true;
  legalInformationOnly: true;
};

type GeneratedExplanation = Pick<
  ExplainStepResult,
  "explanation" | "whyItMatters" | "watchFor" | "sourceIds"
>;

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type ExplainDependencies = {
  apiKey?: string;
  fetch?: FetchLike;
  timeoutMs?: number;
  modelRequestAllowed?: boolean;
  loadCachedResult?: (cacheKey: string) => Promise<unknown | null>;
  persistResult?: (cacheKey: string, output: ExplainStepResult) => Promise<void>;
};

const MAX_BODY_BYTES = 2 * 1024;
const OPENAI_TIMEOUT_MS = 8_000;
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const INPUT_KEYS = ["detailLevel", "guideId", "stepId"];
const LEGAL_CONCLUSION_PATTERN =
  /\b(you should file|you must file|you qualify|you are eligible|you will win|guaranteed|this proves|the deadline is)\b/i;

class RequestValidationError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readLimitedBody(request: Request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw new RequestValidationError(413, "Request body must be 2KB or smaller.");
  }
  if (!request.body) {
    throw new RequestValidationError(400, "Request body must be valid JSON.");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new RequestValidationError(413, "Request body must be 2KB or smaller.");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export async function parseExplainStepRequest(request: Request): Promise<ExplainStepInput> {
  const mediaType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (mediaType !== "application/json") {
    throw new RequestValidationError(415, "Content-Type must be application/json.");
  }

  let value: unknown;
  try {
    value = JSON.parse(await readLimitedBody(request));
  } catch (error) {
    if (error instanceof RequestValidationError) throw error;
    throw new RequestValidationError(400, "Request body must be valid JSON.");
  }
  if (!isRecord(value)) {
    throw new RequestValidationError(400, "Request body must be a JSON object.");
  }
  const keys = Object.keys(value).sort();
  if (keys.length !== INPUT_KEYS.length || !INPUT_KEYS.every((key, index) => keys[index] === key)) {
    throw new RequestValidationError(400, "Request body must contain only guideId, stepId, and detailLevel.");
  }
  if (typeof value.guideId !== "string" || !GUIDE_IDS.includes(value.guideId as GuideId)) {
    throw new RequestValidationError(400, "Select a supported guide.");
  }
  if (typeof value.stepId !== "string" || !/^[a-z0-9-]{1,80}$/.test(value.stepId)) {
    throw new RequestValidationError(400, "Select a supported guide step.");
  }
  if (
    typeof value.detailLevel !== "string" ||
    !GUIDE_DETAIL_LEVELS.includes(value.detailLevel as GuideDetailLevel)
  ) {
    throw new RequestValidationError(400, "Select a supported detail level.");
  }
  if (!getGuideStep(value.guideId, value.stepId)) {
    throw new RequestValidationError(400, "That step does not belong to the selected guide.");
  }

  return value as ExplainStepInput;
}

function deterministicExplanation(input: ExplainStepInput): ExplainStepResult {
  const guide = getGuidePack(input.guideId)!;
  const step = getGuideStep(input.guideId, input.stepId)!;
  const stale = isGuidePackStale(guide);
  return {
    mode: "source-only",
    explanation: stale
      ? "This guide is due for source review. Use the official links and ask a human to confirm the current process before relying on form-specific steps."
      : step.explanation,
    whyItMatters: step.whyItMatters,
    watchFor: step.watchFor,
    sourceIds: step.sourceIds,
    sourcePackStatus: stale ? "stale" : "current",
    humanReviewRequired: true,
    legalInformationOnly: true,
  };
}

function normalizeStrings(value: unknown, minimum: number, maximum: number) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) return null;
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    const text = item.trim();
    if (!text || text.length > 260) return null;
    result.push(text);
  }
  return result;
}

export function validateGeneratedExplanation(
  value: unknown,
  input: ExplainStepInput,
): GeneratedExplanation | null {
  if (!isRecord(value)) return null;
  const keys = Object.keys(value).sort();
  const expected = ["explanation", "sourceIds", "watchFor", "whyItMatters"];
  if (keys.length !== expected.length || !expected.every((key, index) => keys[index] === key)) return null;
  if (typeof value.explanation !== "string" || typeof value.whyItMatters !== "string") return null;
  const explanation = value.explanation.trim();
  const whyItMatters = value.whyItMatters.trim();
  if (!explanation || explanation.length > 700 || !whyItMatters || whyItMatters.length > 400) return null;
  const watchFor = normalizeStrings(value.watchFor, 1, 4);
  if (!watchFor) return null;

  const step = getGuideStep(input.guideId, input.stepId)!;
  const allowed = new Set(step.sourceIds);
  if (
    !Array.isArray(value.sourceIds) ||
    value.sourceIds.length < 1 ||
    value.sourceIds.some((id) => typeof id !== "string" || !allowed.has(id as SourceId))
  ) return null;
  const sourceIds = value.sourceIds as SourceId[];
  if (new Set(sourceIds).size !== sourceIds.length) return null;

  const allText = [explanation, whyItMatters, ...watchFor].join(" ");
  if (LEGAL_CONCLUSION_PATTERN.test(allText)) return null;
  return { explanation, whyItMatters, watchFor, sourceIds };
}

function openAIRequestBody(input: ExplainStepInput) {
  const guide = getGuidePack(input.guideId)!;
  const step = getGuideStep(input.guideId, input.stepId)!;
  return {
    model: "gpt-5.6-sol",
    store: false,
    tools: [],
    max_output_tokens: input.detailLevel === "full" ? 900 : 500,
    input: [
      {
        role: "developer",
        content: [{
          type: "input_text",
          text: [
            "Explain one legal-information preparation step using only supplied official source metadata.",
            "Do not provide legal advice, calculate a deadline, select a form beyond the supplied route, or imply legal sufficiency.",
            "Do not ask for or invent personal facts. Use only supplied source IDs and no URLs in prose.",
          ].join(" "),
        }],
      },
      {
        role: "user",
        content: [{
          type: "input_text",
          text: JSON.stringify({
            guide: { id: guide.id, jurisdiction: guide.jurisdiction, title: guide.title },
            step: {
              id: step.id,
              title: step.title,
              prompt: step.prompt,
              formTarget: step.formTarget,
            },
            detailLevel: input.detailLevel,
            sources: sourceList(step.sourceIds).map(({ id, title, publisher, category }) => ({
              id,
              title,
              publisher,
              category,
            })),
          }),
        }],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "f1ghtback_step_explanation",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["explanation", "whyItMatters", "watchFor", "sourceIds"],
          properties: {
            explanation: { type: "string", minLength: 1, maxLength: 700 },
            whyItMatters: { type: "string", minLength: 1, maxLength: 400 },
            watchFor: {
              type: "array",
              minItems: 1,
              maxItems: 4,
              items: { type: "string", minLength: 1, maxLength: 260 },
            },
            sourceIds: {
              type: "array",
              minItems: 1,
              maxItems: step.sourceIds.length,
              items: { type: "string", enum: step.sourceIds },
            },
          },
        },
      },
    },
  };
}

function extractOutputText(response: unknown) {
  if (!isRecord(response)) return null;
  if (typeof response.output_text === "string") return response.output_text;
  if (!Array.isArray(response.output)) return null;
  const parts: string[] = [];
  for (const output of response.output) {
    if (!isRecord(output) || !Array.isArray(output.content)) continue;
    for (const content of output.content) {
      if (isRecord(content) && typeof content.text === "string") parts.push(content.text);
    }
  }
  return parts.length ? parts.join("") : null;
}

async function requestGeneratedExplanation(
  input: ExplainStepInput,
  apiKey: string,
  fetcher: FetchLike,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(openAIRequestBody(input)),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const outputText = extractOutputText(await response.json());
    if (!outputText) return null;
    return validateGeneratedExplanation(JSON.parse(outputText), input);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function cacheKey(input: ExplainStepInput) {
  const bytes = new TextEncoder().encode(
    `explain:v1:${input.guideId}:${input.stepId}:${input.detailLevel}`,
  );
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validateCachedResult(value: unknown, input: ExplainStepInput): ExplainStepResult | null {
  if (!isRecord(value)) return null;
  const generated = validateGeneratedExplanation(value, input);
  if (
    !generated ||
    value.mode !== "gpt-5.6" ||
    value.sourcePackStatus !== "current" ||
    value.humanReviewRequired !== true ||
    value.legalInformationOnly !== true
  ) return null;
  return {
    mode: "gpt-5.6",
    ...generated,
    sourcePackStatus: "current",
    humanReviewRequired: true,
    legalInformationOnly: true,
  };
}

function jsonResponse(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
}

export async function handleExplainStepRequest(
  request: Request,
  dependencies: ExplainDependencies = {},
) {
  let input: ExplainStepInput;
  try {
    input = await parseExplainStepRequest(request);
  } catch (error) {
    if (error instanceof RequestValidationError) return jsonResponse({ error: error.message }, error.status);
    return jsonResponse({ error: "Request body is invalid." }, 400);
  }

  const guide = getGuidePack(input.guideId)!;
  const fallback = deterministicExplanation(input);
  if (isGuidePackStale(guide) || !dependencies.apiKey || dependencies.modelRequestAllowed === false) {
    return jsonResponse(fallback, 200);
  }

  const key = await cacheKey(input);
  if (dependencies.loadCachedResult) {
    try {
      const cached = validateCachedResult(await dependencies.loadCachedResult(key), input);
      if (cached) return jsonResponse(cached, 200);
    } catch {
      // Cache failure leaves the bounded model and deterministic paths available.
    }
  }

  const generated = await requestGeneratedExplanation(
    input,
    dependencies.apiKey,
    dependencies.fetch ?? fetch,
    dependencies.timeoutMs ?? OPENAI_TIMEOUT_MS,
  );
  if (!generated) return jsonResponse(fallback, 200);

  const result: ExplainStepResult = {
    mode: "gpt-5.6",
    ...generated,
    sourcePackStatus: "current",
    humanReviewRequired: true,
    legalInformationOnly: true,
  };
  if (dependencies.persistResult) {
    try {
      await dependencies.persistResult(key, result);
    } catch {
      // Persistence does not change the validated response.
    }
  }
  return jsonResponse(result, 200);
}
