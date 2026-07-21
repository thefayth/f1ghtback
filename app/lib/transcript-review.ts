export const TRANSCRIPT_SCENARIOS = ["school-meeting", "service-call"] as const;

export type TranscriptScenario = (typeof TRANSCRIPT_SCENARIOS)[number];

export type TranscriptReviewInput = {
  scenarioId: TranscriptScenario;
  transcript: string;
  fictionalConfirmed: true;
};

export type TranscriptExcerpt = {
  id: string;
  timecode: string;
  text: string;
};

export type TranscriptAnalysis = {
  today: string[];
  next: string[];
  waiting: string[];
  doNotTouch: string[];
  facts: string[];
  inferences: string[];
  contradictions: string[];
  missingInfo: string[];
  safeAction: string;
  excerpts: TranscriptExcerpt[];
};

export type AiReceipt = {
  receiptVersion: "bigstick.ai-receipt.v1";
  provider: "openai" | "deterministic";
  model: "gpt-5.6" | "source-only";
  sensitivityRoute: "redacted_ok";
  sourceHash: string;
  purpose: "transcript-to-safe-action";
  draftState: "draft";
  reviewState: "pending-human-review";
  approvalState: "unapproved";
  publicationStatus: "held";
  failureReason?: "model-unavailable-or-invalid";
};

export type TranscriptReviewResult = TranscriptAnalysis & {
  mode: "gpt-5.6" | "source-only";
  aiReceipt: AiReceipt;
};

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type HandlerDependencies = {
  apiKey?: string;
  fetch?: FetchLike;
  timeoutMs?: number;
  modelRequestAllowed?: boolean;
};

const MAX_BODY_BYTES = 8 * 1024;
const MAX_TRANSCRIPT_LENGTH = 6_000;
const OPENAI_TIMEOUT_MS = 10_000;
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const INPUT_KEYS = ["fictionalConfirmed", "scenarioId", "transcript"] as const;

export const SYNTHETIC_TRANSCRIPTS: Record<TranscriptScenario, string> = {
  "school-meeting": `[00:00] Facilitator: This is a fictional planning meeting. The accommodation request was received Monday.\n[00:18] Coordinator: I can review it after the signed release arrives.\n[00:35] Parent A: The release was sent yesterday, but I do not have a receipt.\n[00:52] Coordinator: Please resend it through the documented channel and ask for confirmation.\n[01:08] Facilitator: The next meeting date has not been confirmed.`,
  "service-call": `[00:00] Agent: This is a fictional service call. The request is marked incomplete.\n[00:16] Caller: I uploaded the requested document on Friday.\n[00:32] Agent: I cannot see an upload receipt in this view.\n[00:48] Caller: The portal displayed a success message, but I did not save it.\n[01:04] Agent: Please ask records staff to confirm what was received before uploading anything again.`,
};

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

async function readLimitedBody(request: Request): Promise<string> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
      throw new RequestValidationError(413, "Request body must be 8KB or smaller.");
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
      throw new RequestValidationError(413, "Request body must be 8KB or smaller.");
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
    throw new RequestValidationError(400, "Request body must be valid UTF-8 JSON.");
  }
}

export async function parseTranscriptReviewRequest(
  request: Request,
): Promise<TranscriptReviewInput> {
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
    !INPUT_KEYS.every((key, index) => keys[index] === key)
  ) {
    throw new RequestValidationError(
      400,
      "Request body must contain only fictionalConfirmed, scenarioId, and transcript.",
    );
  }
  if (value.fictionalConfirmed !== true) {
    throw new RequestValidationError(400, "Confirm that the transcript is fictional and public-safe.");
  }
  if (
    typeof value.scenarioId !== "string" ||
    !TRANSCRIPT_SCENARIOS.includes(value.scenarioId as TranscriptScenario)
  ) {
    throw new RequestValidationError(400, "Select a supported fictional scenario.");
  }
  if (typeof value.transcript !== "string") {
    throw new RequestValidationError(400, "Transcript must be text.");
  }
  const transcript = value.transcript.trim();
  if (transcript.length < 80 || transcript.length > MAX_TRANSCRIPT_LENGTH) {
    throw new RequestValidationError(400, "Transcript must be between 80 and 6,000 characters.");
  }

  return {
    scenarioId: value.scenarioId as TranscriptScenario,
    transcript,
    fictionalConfirmed: true,
  };
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function transcriptLines(transcript: string): TranscriptExcerpt[] {
  return transcript
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((line, index) => {
      const match = line.match(/^\[([^\]]+)\]\s*(.*)$/);
      return {
        id: `excerpt-${index + 1}`,
        timecode: match?.[1] ?? `segment ${index + 1}`,
        text: (match?.[2] ?? line).slice(0, 280),
      };
    });
}

export function deterministicTranscriptAnalysis(
  input: TranscriptReviewInput,
): TranscriptAnalysis {
  const school = input.scenarioId === "school-meeting";
  return {
    today: [
      school
        ? "Resend the fictional release through the documented channel and request confirmation."
        : "Ask fictional records staff to confirm what arrived before uploading anything again.",
    ],
    next: [
      school
        ? "Record the confirmation and ask for the next meeting date."
        : "Save the confirmation or receipt beside the original request.",
    ],
    waiting: [school ? "Coordinator review after receipt confirmation." : "Records staff receipt check."],
    doNotTouch: [
      school
        ? "Do not treat the next meeting date as confirmed."
        : "Do not create a duplicate upload until receipt status is checked.",
    ],
    facts: [
      school
        ? "The fictional coordinator said review follows a signed release."
        : "The fictional agent marked the request incomplete.",
      school
        ? "The fictional parent reported sending the release without a receipt."
        : "The fictional caller reported a portal success message without a saved receipt.",
    ],
    inferences: ["A missing receipt may be blocking the next step, but that has not been verified."],
    contradictions: ["The sender reports completion while the receiving system does not show confirmation."],
    missingInfo: [school ? "Confirmed receipt status and next meeting date." : "Confirmed receipt status and document index."],
    safeAction: school
      ? "Request one written receipt confirmation before planning the next meeting step."
      : "Request one receipt check before sending a duplicate document.",
    excerpts: transcriptLines(input.transcript),
  };
}

function normalizeStringArray(
  value: unknown,
  minimum: number,
  maximum: number,
  maxItemLength = 260,
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

export function validateTranscriptAnalysis(value: unknown): TranscriptAnalysis | null {
  if (!isRecord(value)) return null;
  const expectedKeys = [
    "contradictions",
    "doNotTouch",
    "excerpts",
    "facts",
    "inferences",
    "missingInfo",
    "next",
    "safeAction",
    "today",
    "waiting",
  ];
  const keys = Object.keys(value).sort();
  if (keys.length !== expectedKeys.length || !expectedKeys.every((key, index) => keys[index] === key)) {
    return null;
  }

  const today = normalizeStringArray(value.today, 1, 3);
  const next = normalizeStringArray(value.next, 1, 3);
  const waiting = normalizeStringArray(value.waiting, 1, 3);
  const doNotTouch = normalizeStringArray(value.doNotTouch, 1, 3);
  const facts = normalizeStringArray(value.facts, 1, 5);
  const inferences = normalizeStringArray(value.inferences, 1, 4);
  const contradictions = normalizeStringArray(value.contradictions, 1, 4);
  const missingInfo = normalizeStringArray(value.missingInfo, 1, 4);
  if (!today || !next || !waiting || !doNotTouch || !facts || !inferences || !contradictions || !missingInfo) {
    return null;
  }
  if (typeof value.safeAction !== "string") return null;
  const safeAction = value.safeAction.trim();
  if (!safeAction || safeAction.length > 280) return null;
  if (!Array.isArray(value.excerpts) || value.excerpts.length < 2 || value.excerpts.length > 4) return null;

  const excerpts: TranscriptExcerpt[] = [];
  for (const [index, excerpt] of value.excerpts.entries()) {
    if (!isRecord(excerpt)) return null;
    const excerptKeys = Object.keys(excerpt).sort();
    if (excerptKeys.join(",") !== "id,text,timecode") return null;
    if (typeof excerpt.text !== "string" || typeof excerpt.timecode !== "string") return null;
    const text = excerpt.text.trim();
    const timecode = excerpt.timecode.trim();
    if (!text || text.length > 280 || !timecode || timecode.length > 40) return null;
    excerpts.push({ id: `excerpt-${index + 1}`, timecode, text });
  }

  return { today, next, waiting, doNotTouch, facts, inferences, contradictions, missingInfo, safeAction, excerpts };
}

function openAIRequestBody(input: TranscriptReviewInput) {
  return {
    model: "gpt-5.6",
    store: false,
    tools: [],
    max_output_tokens: 1_400,
    input: [
      {
        role: "developer",
        content: [{
          type: "input_text",
          text: [
            "Analyze only the supplied fictional transcript.",
            "Separate facts from inferences, identify contradictions and missing information, and organize work into Today, Next, Waiting, and Do Not Touch.",
            "Return one low-risk action that requests confirmation instead of making a legal, medical, or factual conclusion.",
            "Use transcript language for two to four short excerpts and preserve their timecodes when present.",
            "Do not provide legal advice, diagnose anyone, invent deadlines, or recommend publishing.",
          ].join(" "),
        }],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: JSON.stringify({ scenarioId: input.scenarioId, transcript: input.transcript }) }],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "transcript_review",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["today", "next", "waiting", "doNotTouch", "facts", "inferences", "contradictions", "missingInfo", "safeAction", "excerpts"],
          properties: {
            today: stringArraySchema(1, 3),
            next: stringArraySchema(1, 3),
            waiting: stringArraySchema(1, 3),
            doNotTouch: stringArraySchema(1, 3),
            facts: stringArraySchema(1, 5),
            inferences: stringArraySchema(1, 4),
            contradictions: stringArraySchema(1, 4),
            missingInfo: stringArraySchema(1, 4),
            safeAction: { type: "string", minLength: 1, maxLength: 280 },
            excerpts: {
              type: "array",
              minItems: 2,
              maxItems: 4,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "timecode", "text"],
                properties: {
                  id: { type: "string", minLength: 1, maxLength: 40 },
                  timecode: { type: "string", minLength: 1, maxLength: 40 },
                  text: { type: "string", minLength: 1, maxLength: 280 },
                },
              },
            },
          },
        },
      },
    },
  };
}

function stringArraySchema(minItems: number, maxItems: number) {
  return {
    type: "array",
    minItems,
    maxItems,
    items: { type: "string", minLength: 1, maxLength: 260 },
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
      if (isRecord(content) && (content.type === "output_text" || content.type === "text") && typeof content.text === "string") {
        textParts.push(content.text);
      }
    }
  }
  return textParts.length ? textParts.join("") : null;
}

async function requestGeneratedAnalysis(
  input: TranscriptReviewInput,
  apiKey: string,
  fetcher: FetchLike,
  timeoutMs: number,
): Promise<TranscriptAnalysis | null> {
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
    try {
      return validateTranscriptAnalysis(JSON.parse(outputText));
    } catch {
      return null;
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function receiptFor(sourceHash: string, mode: "gpt-5.6" | "source-only"): AiReceipt {
  const generated = mode === "gpt-5.6";
  return {
    receiptVersion: "bigstick.ai-receipt.v1",
    provider: generated ? "openai" : "deterministic",
    model: mode,
    sensitivityRoute: "redacted_ok",
    sourceHash,
    purpose: "transcript-to-safe-action",
    draftState: "draft",
    reviewState: "pending-human-review",
    approvalState: "unapproved",
    publicationStatus: "held",
    ...(generated ? {} : { failureReason: "model-unavailable-or-invalid" as const }),
  };
}

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
}

export async function handleTranscriptReviewRequest(
  request: Request,
  dependencies: HandlerDependencies = {},
): Promise<Response> {
  let input: TranscriptReviewInput;
  try {
    input = await parseTranscriptReviewRequest(request);
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return jsonResponse({ error: error.message }, error.status);
    }
    return jsonResponse({ error: "Request body is invalid." }, 400);
  }

  const sourceHash = await sha256(`bigstick.transcript.v1:${input.scenarioId}:${input.transcript}`);
  let mode: "gpt-5.6" | "source-only" = "source-only";
  let analysis = deterministicTranscriptAnalysis(input);

  if (dependencies.apiKey && dependencies.modelRequestAllowed !== false) {
    const generated = await requestGeneratedAnalysis(
      input,
      dependencies.apiKey,
      dependencies.fetch ?? fetch,
      dependencies.timeoutMs ?? OPENAI_TIMEOUT_MS,
    );
    if (generated) {
      mode = "gpt-5.6";
      analysis = generated;
    }
  }

  return jsonResponse({ mode, ...analysis, aiReceipt: receiptFor(sourceHash, mode) }, 200);
}
