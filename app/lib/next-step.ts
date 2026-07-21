import {
  sourceList,
  type SourceId,
} from "./source-manifest.ts";

export const JURISDICTIONS = ["california", "utah", "cross-state"] as const;
export const NEEDS = ["file", "respond", "protection", "help", "review"] as const;
export const TIMINGS = ["today", "seven-days", "later-or-unknown"] as const;

export type Jurisdiction = (typeof JURISDICTIONS)[number];
export type Need = (typeof NEEDS)[number];
export type Timing = (typeof TIMINGS)[number];

export type NextStepInput = {
  jurisdiction: Jurisdiction;
  need: Need;
  timing: Timing;
};

export type NextStepResult = {
  mode: "gpt-5.6" | "source-only";
  nextAction: string;
  checklist: string[];
  reviewQuestions: string[];
  sourceIds: SourceId[];
  humanReviewRequired: true;
  legalInformationOnly: true;
};

type GeneratedOutput = Pick<
  NextStepResult,
  "nextAction" | "checklist" | "reviewQuestions" | "sourceIds"
>;

export { OFFICIAL_SOURCES } from "./source-manifest.ts";

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type HandlerDependencies = {
  apiKey?: string;
  rateScope?: string;
  fetch?: FetchLike;
  timeoutMs?: number;
  persistResult?: (
    combinationHash: string,
    output: NextStepResult,
  ) => Promise<void>;
  loadCachedResult?: (combinationHash: string) => Promise<unknown | null>;
  incrementRateCounter?: (counterHash: string) => Promise<number | null>;
};

const MAX_BODY_BYTES = 4 * 1024;
const OPENAI_TIMEOUT_MS = 8_000;
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DAILY_MODEL_REQUEST_LIMIT = 25;
const INPUT_KEYS = ["jurisdiction", "need", "timing"] as const;

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

function isEnumValue<T extends readonly string[]>(
  values: T,
  value: unknown,
): value is T[number] {
  return typeof value === "string" && values.includes(value as T[number]);
}

async function readLimitedBody(request: Request): Promise<string> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
      throw new RequestValidationError(413, "Request body must be 4KB or smaller.");
    }
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
      throw new RequestValidationError(413, "Request body must be 4KB or smaller.");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new RequestValidationError(400, "Request body must be valid JSON.");
  }
}

export async function parseNextStepRequest(request: Request): Promise<NextStepInput> {
  const mediaType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (mediaType !== "application/json") {
    throw new RequestValidationError(415, "Content-Type must be application/json.");
  }

  const rawBody = await readLimitedBody(request);
  let value: unknown;
  try {
    value = JSON.parse(rawBody);
  } catch {
    throw new RequestValidationError(400, "Request body must be valid JSON.");
  }

  if (!isRecord(value)) {
    throw new RequestValidationError(400, "Request body must be a JSON object.");
  }

  const keys = Object.keys(value).sort();
  if (
    keys.length !== INPUT_KEYS.length ||
    !INPUT_KEYS.every((key) => Object.hasOwn(value, key))
  ) {
    throw new RequestValidationError(
      400,
      "Request body must contain only jurisdiction, need, and timing.",
    );
  }

  if (
    !isEnumValue(JURISDICTIONS, value.jurisdiction) ||
    !isEnumValue(NEEDS, value.need) ||
    !isEnumValue(TIMINGS, value.timing)
  ) {
    throw new RequestValidationError(400, "Request fields contain an invalid value.");
  }

  return {
    jurisdiction: value.jurisdiction,
    need: value.need,
    timing: value.timing,
  };
}

function sourceIdsFor(input: NextStepInput): SourceId[] {
  if (input.jurisdiction === "cross-state") {
    return ["ca-legal-help", "ut-legal-help", "ada-courts"];
  }

  if (input.jurisdiction === "california") {
    if (input.need === "help") return ["ca-legal-help", "ada-courts"];
    if (input.need === "protection") return ["ca-self-help", "ca-legal-help"];
    return ["ca-self-help", "ca-court-forms", "la-family-law", "ca-legal-help"];
  }

  if (input.need === "help") return ["ut-legal-help", "ada-courts"];
  if (input.need === "protection") {
    return ["ut-protective-orders", "ut-legal-help"];
  }
  return ["ut-family", "ut-mypaperwork", "ut-legal-help"];
}

export function getAllowedSources(input: NextStepInput) {
  return sourceList(sourceIdsFor(input));
}

function timingChecklistItem(timing: Timing): string {
  if (timing === "today") {
    return "Tell the human reviewer that you need timing and urgency checked today.";
  }
  if (timing === "seven-days") {
    return "Ask a human reviewer to confirm any timing concern within the next seven days.";
  }
  return "Ask a human reviewer to identify any timing concern before you take action.";
}

function stateFallback(input: NextStepInput): GeneratedOutput {
  const stateName = input.jurisdiction === "california" ? "California" : "Utah";
  const sourceIds = sourceIdsFor(input);
  const timingItem = timingChecklistItem(input.timing);

  if (input.need === "file") {
    return {
      nextAction: `Open the official ${stateName} court sources and identify the relevant case category before choosing a form.`,
      checklist: [
        "Start with the official self-help information linked below.",
        "Compare the case category with the official forms or paperwork source.",
        timingItem,
        "Confirm the form, local filing requirements, and service steps with a human reviewer before filing.",
      ],
      reviewQuestions: [
        "Is this the correct case category and court location?",
        "Which current form and local requirements apply?",
        "What filing, notice, or service timing needs human confirmation?",
      ],
      sourceIds,
    };
  }

  if (input.need === "respond") {
    return {
      nextAction: `Use the official ${stateName} court sources to identify the response category, then confirm it with a human reviewer.`,
      checklist: [
        "Keep every page you received together and note the date it was received.",
        "Use the official self-help or paperwork source to identify the response category.",
        timingItem,
        "Confirm the response form, filing location, notice, and service requirements before acting.",
      ],
      reviewQuestions: [
        "What kind of response does this document call for?",
        "Which court and current form should be confirmed?",
        "What deadline, filing, notice, or service issue requires human review?",
      ],
      sourceIds,
    };
  }

  if (input.need === "protection") {
    return {
      nextAction: `Open the official ${stateName} protection information and contact human legal help to confirm the safest next action.`,
      checklist: [
        "Read the official protection information linked below.",
        timingItem,
        "Ask human legal help which protections and court location can be reviewed.",
        "Confirm every form, filing, notice, and safety step before acting.",
      ],
      reviewQuestions: [
        "Which protection options can a qualified human review with me?",
        "Which court location and current forms need confirmation?",
        "Are there urgent safety, notice, or timing issues to address?",
      ],
      sourceIds,
    };
  }

  if (input.need === "help") {
    return {
      nextAction: `Open the official ${stateName} legal-help directory and contact a listed provider or court self-help service.`,
      checklist: [
        "Open the official legal-help directory linked below.",
        "Choose a listed provider or court self-help service that matches the general issue.",
        timingItem,
        "Ask about accessibility support if it would make the process easier to use.",
      ],
      reviewQuestions: [
        "Can this service review my type of issue?",
        "What information should I have ready for the conversation?",
        "What timing or accessibility support should I request?",
      ],
      sourceIds,
    };
  }

  return {
    nextAction: `Use the official ${stateName} court and legal-help sources to prepare focused questions for a human reviewer.`,
    checklist: [
      "Open the official sources linked below and note the relevant page titles.",
      "Write down what needs confirmation without adding names or case details here.",
      timingItem,
      "Take the questions below to court self-help, legal aid, or a qualified lawyer.",
    ],
    reviewQuestions: [
      "Which jurisdiction, court location, and case category should be confirmed?",
      "Which current forms or response steps require review?",
      "What timing, notice, service, safety, or accessibility issue matters next?",
    ],
    sourceIds,
  };
}

function crossStateFallback(input: NextStepInput): GeneratedOutput {
  return {
    nextAction:
      "Contact official legal-help directories for both relevant states and ask which jurisdiction should review the issue before you take action.",
    checklist: [
      "Open the official legal-help directories linked below.",
      "Ask a human reviewer which jurisdiction can address the issue.",
      timingChecklistItem(input.timing),
      "Wait for jurisdiction-specific human review before taking a state-specific action.",
    ],
    reviewQuestions: [
      "Which jurisdiction can address this issue?",
      "Is there a timing or safety concern that needs local human review?",
      "What neutral records should I have available for that review?",
    ],
    sourceIds: sourceIdsFor(input),
  };
}

export function deterministicFallback(input: NextStepInput): NextStepResult {
  const output =
    input.jurisdiction === "cross-state"
      ? crossStateFallback(input)
      : stateFallback(input);

  return {
    mode: "source-only",
    ...output,
    humanReviewRequired: true,
    legalInformationOnly: true,
  };
}

function normalizeStringArray(
  value: unknown,
  minimum: number,
  maximum: number,
  maxItemLength: number,
): string[] | null {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    return null;
  }

  const normalized: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    const text = item.trim();
    if (!text || text.length > maxItemLength || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) {
      return null;
    }
    normalized.push(text);
  }
  return normalized;
}

const CROSS_STATE_PROCEDURE_PATTERN =
  /\b(california|utah|forms?|fil(?:e|es|ed|ing)|petition|motion|complaint|serve|served|service of process|court clerk|case type|protective order|restraining order)\b/i;
const LEGAL_CONCLUSION_PATTERN =
  /\b(you are eligible|you qualify|you will win|guaranteed outcome|must file|should file)\b/i;

export function validateGeneratedOutput(
  value: unknown,
  input: NextStepInput,
): GeneratedOutput | null {
  if (!isRecord(value)) return null;
  const expectedKeys = ["checklist", "nextAction", "reviewQuestions", "sourceIds"];
  const keys = Object.keys(value).sort();
  if (
    keys.length !== expectedKeys.length ||
    !expectedKeys.every((key, index) => keys[index] === key)
  ) {
    return null;
  }

  if (typeof value.nextAction !== "string") return null;
  const nextAction = value.nextAction.trim();
  if (!nextAction || nextAction.length > 240) return null;

  const checklist = normalizeStringArray(value.checklist, 2, 5, 240);
  const reviewQuestions = normalizeStringArray(value.reviewQuestions, 2, 4, 240);
  if (!checklist || !reviewQuestions) return null;

  const allowedSourceIds = new Set(sourceIdsFor(input));
  if (
    !Array.isArray(value.sourceIds) ||
    value.sourceIds.length < 1 ||
    value.sourceIds.length > allowedSourceIds.size ||
    value.sourceIds.some(
      (id) => typeof id !== "string" || !allowedSourceIds.has(id as SourceId),
    )
  ) {
    return null;
  }
  const sourceIds = value.sourceIds as SourceId[];
  if (new Set(sourceIds).size !== sourceIds.length) return null;

  const allText = [nextAction, ...checklist, ...reviewQuestions].join(" ");
  if (LEGAL_CONCLUSION_PATTERN.test(allText)) return null;
  if (
    input.jurisdiction === "cross-state" &&
    CROSS_STATE_PROCEDURE_PATTERN.test(allText)
  ) {
    return null;
  }

  return { nextAction, checklist, reviewQuestions, sourceIds };
}

function validateCachedResult(
  value: unknown,
  input: NextStepInput,
): NextStepResult | null {
  if (!isRecord(value)) return null;
  const generated = validateGeneratedOutput(
    {
      nextAction: value.nextAction,
      checklist: value.checklist,
      reviewQuestions: value.reviewQuestions,
      sourceIds: value.sourceIds,
    },
    input,
  );
  if (
    !generated ||
    value.mode !== "gpt-5.6" ||
    value.humanReviewRequired !== true ||
    value.legalInformationOnly !== true ||
    Object.keys(value).length !== 7
  ) {
    return null;
  }
  return {
    mode: "gpt-5.6",
    ...generated,
    humanReviewRequired: true,
    legalInformationOnly: true,
  };
}

function openAIRequestBody(input: NextStepInput) {
  const sources = getAllowedSources(input);
  return {
    model: "gpt-5.6-sol",
    store: false,
    tools: [],
    max_output_tokens: 700,
    input: [
      {
        role: "developer",
        content: [
          {
            type: "input_text",
            text: [
              "Return one contained next action using only the supplied official source metadata.",
              "Provide legal information, not legal advice or conclusions.",
              "Require human review for jurisdiction, forms, deadlines, filing, notice, service, and safety.",
              "Use only supplied source IDs and do not include URLs in prose.",
              "For cross-state input, do not recommend any form, filing, state procedure, or state-specific action; direct the person to neutral human jurisdiction review.",
            ].join(" "),
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              jurisdiction: input.jurisdiction,
              need: input.need,
              timing: input.timing,
              sources,
            }),
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "next_step",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["nextAction", "checklist", "reviewQuestions", "sourceIds"],
          properties: {
            nextAction: { type: "string", minLength: 1, maxLength: 240 },
            checklist: {
              type: "array",
              minItems: 2,
              maxItems: 5,
              items: { type: "string", minLength: 1, maxLength: 240 },
            },
            reviewQuestions: {
              type: "array",
              minItems: 2,
              maxItems: 4,
              items: { type: "string", minLength: 1, maxLength: 240 },
            },
            sourceIds: {
              type: "array",
              minItems: 1,
              maxItems: sources.length,
              uniqueItems: true,
              items: { type: "string", enum: sources.map((source) => source.id) },
            },
          },
        },
      },
    },
  };
}

function extractOutputText(response: unknown): string | null {
  if (!isRecord(response)) return null;
  if (typeof response.output_text === "string") return response.output_text;
  if (!Array.isArray(response.output)) return null;

  const textParts: string[] = [];
  for (const output of response.output) {
    if (!isRecord(output) || !Array.isArray(output.content)) continue;
    for (const content of output.content) {
      if (
        isRecord(content) &&
        (content.type === "output_text" || content.type === "text") &&
        typeof content.text === "string"
      ) {
        textParts.push(content.text);
      }
    }
  }
  return textParts.length ? textParts.join("") : null;
}

async function requestGeneratedOutput(
  input: NextStepInput,
  apiKey: string,
  fetcher: FetchLike,
  timeoutMs: number,
): Promise<GeneratedOutput | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(openAIRequestBody(input)),
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const payload: unknown = await response.json();
    const outputText = extractOutputText(payload);
    if (!outputText) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      return null;
    }
    return validateGeneratedOutput(parsed, input);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function enumCombinationHash(input: NextStepInput): Promise<string> {
  return sha256(`v1:${input.jurisdiction}:${input.need}:${input.timing}`);
}

export function dailyRateCounterHash(
  clientAddress: string,
  salt: string,
  now = new Date(),
): Promise<string> {
  const day = now.toISOString().slice(0, 10);
  return sha256(`v1:${day}:${salt}:${clientAddress}`);
}

export function globalDailyRateCounterKey(
  scope: string,
  now = new Date(),
): Promise<string> {
  const day = now.toISOString().slice(0, 10);
  return sha256(`v2:${day}:${scope}`);
}

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

async function settleStorage(operation: (() => Promise<void>) | undefined) {
  if (!operation) return;
  try {
    await operation();
  } catch {
    // Storage is optional and never changes the legal-information response.
  }
}

export async function handleNextStepRequest(
  request: Request,
  dependencies: HandlerDependencies = {},
): Promise<Response> {
  let input: NextStepInput;
  try {
    input = await parseNextStepRequest(request);
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return jsonResponse({ error: error.message }, error.status);
    }
    return jsonResponse({ error: "Request body is invalid." }, 400);
  }

  const combinationHash = await enumCombinationHash(input);
  const fallback = deterministicFallback(input);
  let result = fallback;
  let generatedFreshResult = false;

  if (dependencies.apiKey) {
    if (dependencies.loadCachedResult) {
      try {
        const cached = validateCachedResult(
          await dependencies.loadCachedResult(combinationHash),
          input,
        );
        if (cached) result = cached;
      } catch {
        // Cache failures do not block the deterministic result or model path.
      }
    }

    let modelRequestAllowed = result.mode !== "gpt-5.6";
    if (
      modelRequestAllowed &&
      dependencies.incrementRateCounter &&
      dependencies.rateScope
    ) {
      try {
        const counterHash = await globalDailyRateCounterKey(dependencies.rateScope);
        const count = await dependencies.incrementRateCounter(counterHash);
        if (count !== null && count > DAILY_MODEL_REQUEST_LIMIT) {
          modelRequestAllowed = false;
        }
      } catch {
        // D1 is optional; a transient storage failure does not disable the tool.
      }
    }

    if (modelRequestAllowed) {
      const generated = await requestGeneratedOutput(
        input,
        dependencies.apiKey,
        dependencies.fetch ?? fetch,
        dependencies.timeoutMs ?? OPENAI_TIMEOUT_MS,
      );
      if (generated) {
        result = {
          mode: "gpt-5.6",
          ...generated,
          humanReviewRequired: true,
          legalInformationOnly: true,
        };
        generatedFreshResult = true;
      }
    }
  }

  if (generatedFreshResult && dependencies.persistResult) {
    await settleStorage(() => dependencies.persistResult!(combinationHash, result));
  }

  return jsonResponse(result, 200);
}
