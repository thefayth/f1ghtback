import assert from "node:assert/strict";
import test from "node:test";

import {
  handleNextStepRequest,
  validateGeneratedOutput,
} from "../app/lib/next-step.ts";

const validInput = {
  jurisdiction: "california",
  need: "file",
  timing: "today",
};

const generatedOutput = {
  nextAction: "Open the official court self-help source and prepare for human review.",
  checklist: [
    "Read the supplied official source.",
    "Confirm the current requirements with a human reviewer.",
  ],
  reviewQuestions: [
    "Which case category applies?",
    "What timing needs confirmation?",
  ],
  sourceIds: ["ca-self-help", "ca-legal-help"],
};

function requestFor(body, contentType = "application/json") {
  const headers = contentType ? { "content-type": contentType } : undefined;
  return new Request("http://localhost/api/next-step", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function openAIResponse(output) {
  return new Response(
    JSON.stringify({
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: JSON.stringify(output) }],
        },
      ],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

async function responseJson(body, dependencies) {
  const response = await handleNextStepRequest(requestFor(body), dependencies);
  return { response, payload: await response.json() };
}

test("rejects missing, extra, array, and unknown enum inputs", async () => {
  const invalidBodies = [
    { jurisdiction: "california", need: "file" },
    { ...validInput, details: "private" },
    [validInput],
    { ...validInput, jurisdiction: ["california"] },
    { ...validInput, jurisdiction: "nevada" },
    { ...validInput, need: "appeal" },
    { ...validInput, timing: "tomorrow" },
  ];

  for (const body of invalidBodies) {
    const response = await handleNextStepRequest(requestFor(body));
    assert.equal(response.status, 400);
    assert.deepEqual(Object.keys(await response.json()), ["error"]);
  }
});

test("rejects wrong content type and malformed JSON", async () => {
  const wrongType = await handleNextStepRequest(
    requestFor(JSON.stringify(validInput), "text/plain"),
  );
  assert.equal(wrongType.status, 415);

  const malformed = await handleNextStepRequest(requestFor('{"jurisdiction":'));
  assert.equal(malformed.status, 400);
});

test("rejects request bodies larger than 4KB", async () => {
  const oversized = JSON.stringify({ ...validInput, padding: "x".repeat(4096) });
  const response = await handleNextStepRequest(requestFor(oversized));
  assert.equal(response.status, 413);
});

test("uses deterministic source-only fallback when the API key is missing", async () => {
  let fetchCalled = false;
  const first = await responseJson(validInput, {
    fetch: async () => {
      fetchCalled = true;
      return openAIResponse(generatedOutput);
    },
  });
  const second = await responseJson(validInput, {});

  assert.equal(fetchCalled, false);
  assert.equal(first.response.status, 200);
  assert.deepEqual(first.payload, second.payload);
  assert.equal(first.payload.mode, "source-only");
  assert.equal(first.payload.humanReviewRequired, true);
  assert.equal(first.payload.legalInformationOnly, true);
  assert.deepEqual(Object.keys(first.payload).sort(), [
    "checklist",
    "humanReviewRequired",
    "legalInformationOnly",
    "mode",
    "nextAction",
    "reviewQuestions",
    "sourceIds",
  ]);
});

test("calls the Responses API directly with structured JSON and allowlisted data", async () => {
  let capturedUrl;
  let capturedInit;
  const { payload } = await responseJson(validInput, {
    apiKey: "test-key",
    fetch: async (url, init) => {
      capturedUrl = url;
      capturedInit = init;
      return openAIResponse(generatedOutput);
    },
  });

  assert.equal(capturedUrl, "https://api.openai.com/v1/responses");
  assert.equal(capturedInit.method, "POST");
  assert.equal(capturedInit.headers.authorization, "Bearer test-key");

  const apiBody = JSON.parse(capturedInit.body);
  assert.equal(apiBody.model, "gpt-5.6");
  assert.equal(apiBody.store, false);
  assert.deepEqual(apiBody.tools, []);
  assert.equal(apiBody.text.format.type, "json_schema");
  assert.equal(apiBody.text.format.strict, true);

  const modelInput = JSON.parse(apiBody.input[1].content[0].text);
  assert.deepEqual(Object.keys(modelInput).sort(), [
    "jurisdiction",
    "need",
    "sources",
    "timing",
  ]);
  assert.equal(modelInput.jurisdiction, validInput.jurisdiction);
  assert.equal(modelInput.need, validInput.need);
  assert.equal(modelInput.timing, validInput.timing);
  assert.ok(modelInput.sources.length > 0);
  assert.ok(
    modelInput.sources.every(
      (source) =>
        typeof source.id === "string" &&
        typeof source.title === "string" &&
        typeof source.publisher === "string" &&
        source.url.startsWith("https://"),
    ),
  );

  assert.equal(payload.mode, "gpt-5.6");
  assert.deepEqual(payload.sourceIds, generatedOutput.sourceIds);
  assert.equal(payload.humanReviewRequired, true);
  assert.equal(payload.legalInformationOnly, true);
});

test("falls back on timeout, API error, and malformed model output", async () => {
  const timeoutFetch = (_url, init) =>
    new Promise((_resolve, reject) => {
      init.signal.addEventListener(
        "abort",
        () => reject(new DOMException("Aborted", "AbortError")),
        { once: true },
      );
    });

  const cases = [
    { fetch: timeoutFetch, timeoutMs: 10 },
    { fetch: async () => new Response("error", { status: 500 }) },
    {
      fetch: async () =>
        new Response(JSON.stringify({ output_text: "not-json" }), { status: 200 }),
    },
  ];

  for (const dependencies of cases) {
    const { payload } = await responseJson(validInput, {
      apiKey: "test-key",
      ...dependencies,
    });
    assert.equal(payload.mode, "source-only");
  }
});

test("falls back when model output uses a disallowed source or extra field", async () => {
  const disallowedOutputs = [
    { ...generatedOutput, sourceIds: ["ut-family"] },
    { ...generatedOutput, hiddenAdvice: "file now" },
  ];

  for (const output of disallowedOutputs) {
    const { payload } = await responseJson(validInput, {
      apiKey: "test-key",
      fetch: async () => openAIResponse(output),
    });
    assert.equal(payload.mode, "source-only");
  }
});

test("reuses a validated global cache entry without another model request", async () => {
  let fetchCalled = false;
  const cached = {
    mode: "gpt-5.6",
    ...generatedOutput,
    humanReviewRequired: true,
    legalInformationOnly: true,
  };
  const { payload } = await responseJson(validInput, {
    apiKey: "test-key",
    loadCachedResult: async () => cached,
    fetch: async () => {
      fetchCalled = true;
      return openAIResponse(generatedOutput);
    },
  });

  assert.equal(fetchCalled, false);
  assert.deepEqual(payload, cached);
});

test("uses source-only fallback after the daily model-request limit", async () => {
  let fetchCalled = false;
  const { payload } = await responseJson(validInput, {
    apiKey: "test-key",
    clientAddress: "203.0.113.9",
    rateSalt: "test-salt",
    incrementRateCounter: async () => 26,
    fetch: async () => {
      fetchCalled = true;
      return openAIResponse(generatedOutput);
    },
  });

  assert.equal(fetchCalled, false);
  assert.equal(payload.mode, "source-only");
});

test("cross-state never returns forms, filing, or a state procedure", async () => {
  const input = { ...validInput, jurisdiction: "cross-state" };
  const unsafeOutput = {
    ...generatedOutput,
    nextAction: "File the California form now.",
    sourceIds: ["ca-legal-help"],
  };
  const { payload } = await responseJson(input, {
    apiKey: "test-key",
    fetch: async () => openAIResponse(unsafeOutput),
  });

  assert.equal(payload.mode, "source-only");
  assert.doesNotMatch(
    [payload.nextAction, ...payload.checklist, ...payload.reviewQuestions].join(" "),
    /\b(california|utah|forms?|fil(?:e|es|ed|ing)|petition|motion|serve|service of process)\b/i,
  );
  assert.deepEqual(payload.sourceIds, [
    "ca-legal-help",
    "ut-legal-help",
    "ada-courts",
  ]);
});

test("model validation rejects legal conclusions", () => {
  assert.equal(
    validateGeneratedOutput(
      { ...generatedOutput, nextAction: "You should file this today." },
      validInput,
    ),
    null,
  );
});

test("persists only hashes and validated generated output", async () => {
  let storedCombinationHash;
  let storedOutput;
  let storedCounterHash;

  const { response, payload } = await responseJson(validInput, {
    apiKey: "test-key",
    clientAddress: "203.0.113.9",
    rateSalt: "test-salt",
    fetch: async () => openAIResponse(generatedOutput),
    persistResult: async (combinationHash, output) => {
      storedCombinationHash = combinationHash;
      storedOutput = output;
    },
    incrementRateCounter: async (counterHash) => {
      storedCounterHash = counterHash;
      return 1;
    },
  });

  assert.equal(response.status, 200);
  assert.match(storedCombinationHash, /^[a-f0-9]{64}$/);
  assert.match(storedCounterHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(storedOutput, payload);
  assert.doesNotMatch(storedCombinationHash, /california|file|today/);
  assert.doesNotMatch(storedCounterHash, /203\.0\.113\.9/);
});

test("D1 failures fail open without changing validated output", async () => {
  const { payload } = await responseJson(validInput, {
    apiKey: "test-key",
    clientAddress: "203.0.113.9",
    rateSalt: "test-salt",
    loadCachedResult: async () => {
      throw new Error("D1 unavailable");
    },
    incrementRateCounter: async () => {
      throw new Error("D1 unavailable");
    },
    fetch: async () => openAIResponse(generatedOutput),
  });

  assert.equal(payload.mode, "gpt-5.6");
});
