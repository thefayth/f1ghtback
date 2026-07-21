import assert from "node:assert/strict";
import test from "node:test";

import {
  handleExplainStepRequest,
  validateGeneratedExplanation,
} from "../app/lib/explain-step.ts";

const validInput = {
  guideId: "ca-fl-320-response",
  stepId: "requested-orders",
  detailLevel: "brief",
};

const generated = {
  explanation: "Use the subjects visibly selected on the Request for Order to organize response notes for review.",
  whyItMatters: "The response should remain connected to the requests shown in the papers.",
  watchFor: ["Additional financial or local forms may need human confirmation."],
  sourceIds: ["ca-rfo-response", "ca-fl-320"],
};

function requestFor(body) {
  return new Request("http://localhost/api/explain-step", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function openAIResponse(output) {
  return new Response(JSON.stringify({ output_text: JSON.stringify(output) }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

test("explain-step accepts only guide, step, and detail enums", async () => {
  for (const input of [
    { ...validInput, narrative: "private answer" },
    { ...validInput, guideId: "unknown" },
    { ...validInput, stepId: "facts-scaffold", detailLevel: "very-long" },
    { ...validInput, stepId: "not-a-real-step" },
  ]) {
    const response = await handleExplainStepRequest(requestFor(input));
    assert.equal(response.status, 400);
  }
});

test("missing API key returns deterministic source-only guidance", async () => {
  const response = await handleExplainStepRequest(requestFor(validInput));
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.mode, "source-only");
  assert.equal(payload.humanReviewRequired, true);
  assert.deepEqual(payload.sourceIds, ["ca-rfo-response", "ca-fl-320", "ca-rule-5-92"]);
});

test("GPT receives no personal answer fields and only allowlisted source metadata", async () => {
  let capturedBody;
  const response = await handleExplainStepRequest(requestFor(validInput), {
    apiKey: "test-key",
    fetch: async (_url, init) => {
      capturedBody = JSON.parse(init.body);
      return openAIResponse(generated);
    },
  });
  const payload = await response.json();
  assert.equal(payload.mode, "gpt-5.6");
  assert.equal(capturedBody.store, false);
  assert.deepEqual(capturedBody.tools, []);
  const prompt = JSON.parse(capturedBody.input[1].content[0].text);
  assert.deepEqual(Object.keys(prompt).sort(), ["detailLevel", "guide", "sources", "step"]);
  assert.doesNotMatch(JSON.stringify(prompt), /name|address|caseNumber|narrative|answer|serviceDate/i);
  assert.ok(prompt.sources.every((source) => !source.url));
});

test("malformed, invented-source, and legal-conclusion outputs fall back", async () => {
  const outputs = [
    { ...generated, sourceIds: ["ut-family-answer"] },
    { ...generated, explanation: "You should file this today." },
    { ...generated, secret: "extra" },
  ];
  for (const output of outputs) {
    const response = await handleExplainStepRequest(requestFor(validInput), {
      apiKey: "test-key",
      fetch: async () => openAIResponse(output),
    });
    assert.equal((await response.json()).mode, "source-only");
  }
  assert.equal(validateGeneratedExplanation({ ...generated, sourceIds: ["ut-family-answer"] }, validInput), null);
});

test("budget hold does not call GPT", async () => {
  let called = false;
  const response = await handleExplainStepRequest(requestFor(validInput), {
    apiKey: "test-key",
    modelRequestAllowed: false,
    fetch: async () => {
      called = true;
      return openAIResponse(generated);
    },
  });
  assert.equal(called, false);
  assert.equal((await response.json()).mode, "source-only");
});
