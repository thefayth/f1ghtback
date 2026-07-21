import assert from "node:assert/strict";
import test from "node:test";

import {
  SYNTHETIC_TRANSCRIPTS,
  handleTranscriptReviewRequest,
  validateTranscriptAnalysis,
} from "../app/lib/transcript-review.ts";

const validInput = {
  scenarioId: "school-meeting",
  transcript: SYNTHETIC_TRANSCRIPTS["school-meeting"],
  fictionalConfirmed: true,
};

const generatedAnalysis = {
  today: ["Request written receipt confirmation."],
  next: ["Record the confirmation for review."],
  waiting: ["Coordinator review."],
  doNotTouch: ["Do not treat the meeting date as confirmed."],
  facts: ["The coordinator said review follows receipt."],
  inferences: ["The missing receipt may be blocking review."],
  contradictions: ["The sender reports completion while the receiver lacks confirmation."],
  missingInfo: ["Confirmed receipt status."],
  safeAction: "Request one written receipt confirmation before taking another step.",
  excerpts: [
    { id: "model-1", timecode: "00:18", text: "I can review it after the signed release arrives." },
    { id: "model-2", timecode: "00:35", text: "The release was sent yesterday, but I do not have a receipt." },
  ],
};

function requestFor(body, contentType = "application/json") {
  return new Request("http://localhost/api/transcript-review", {
    method: "POST",
    headers: contentType ? { "content-type": contentType } : undefined,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function openAIResponse(output) {
  return new Response(JSON.stringify({
    output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(output) }] }],
  }), { status: 200, headers: { "content-type": "application/json" } });
}

test("rejects non-fictional, unknown, extra, and oversized transcript requests", async () => {
  const invalid = [
    { ...validInput, fictionalConfirmed: false },
    { ...validInput, scenarioId: "private-case" },
    { ...validInput, details: "extra" },
    { ...validInput, transcript: "too short" },
  ];
  for (const body of invalid) {
    const response = await handleTranscriptReviewRequest(requestFor(body));
    assert.equal(response.status, 400);
  }

  const oversized = await handleTranscriptReviewRequest(requestFor({
    ...validInput,
    transcript: "x".repeat(7000),
  }));
  assert.ok([400, 413].includes(oversized.status));
});

test("returns a deterministic held draft when GPT-5.6 is unavailable", async () => {
  const response = await handleTranscriptReviewRequest(requestFor(validInput));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.mode, "source-only");
  assert.equal(payload.aiReceipt.provider, "deterministic");
  assert.equal(payload.aiReceipt.publicationStatus, "held");
  assert.equal(payload.aiReceipt.approvalState, "unapproved");
  assert.match(payload.aiReceipt.sourceHash, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(payload.aiReceipt), /Facilitator|Coordinator|Parent A/);
  assert.ok(payload.today.length > 0);
  assert.ok(payload.doNotTouch.length > 0);
});

test("uses GPT-5.6 structured output without storage or tools", async () => {
  let capturedUrl;
  let capturedInit;
  const response = await handleTranscriptReviewRequest(requestFor(validInput), {
    apiKey: "test-key",
    fetch: async (url, init) => {
      capturedUrl = url;
      capturedInit = init;
      return openAIResponse(generatedAnalysis);
    },
  });
  const payload = await response.json();

  assert.equal(capturedUrl, "https://api.openai.com/v1/responses");
  assert.equal(capturedInit.headers.authorization, "Bearer test-key");
  const apiBody = JSON.parse(capturedInit.body);
  assert.equal(apiBody.model, "gpt-5.6");
  assert.equal(apiBody.store, false);
  assert.deepEqual(apiBody.tools, []);
  assert.equal(apiBody.text.format.type, "json_schema");
  assert.equal(apiBody.text.format.strict, true);
  assert.equal(payload.mode, "gpt-5.6");
  assert.equal(payload.aiReceipt.provider, "openai");
  assert.equal(payload.aiReceipt.reviewState, "pending-human-review");
  assert.equal(payload.aiReceipt.publicationStatus, "held");
});

test("falls back when the model is offline or returns invalid output", async () => {
  const cases = [
    async () => new Response("offline", { status: 503 }),
    async () => openAIResponse({ ...generatedAnalysis, publicationStatus: "published" }),
    async () => new Response(JSON.stringify({ output_text: "not-json" }), { status: 200 }),
  ];

  for (const fetcher of cases) {
    const response = await handleTranscriptReviewRequest(requestFor(validInput), {
      apiKey: "test-key",
      fetch: fetcher,
    });
    const payload = await response.json();
    assert.equal(payload.mode, "source-only");
    assert.equal(payload.aiReceipt.failureReason, "model-unavailable-or-invalid");
  }
});

test("normalizes excerpt IDs and rejects malformed analysis", () => {
  const validated = validateTranscriptAnalysis(generatedAnalysis);
  assert.equal(validated?.excerpts[0].id, "excerpt-1");
  assert.equal(validateTranscriptAnalysis({ ...generatedAnalysis, hidden: true }), null);
  assert.equal(validateTranscriptAnalysis({ ...generatedAnalysis, today: [] }), null);
});
