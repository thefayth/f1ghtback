import assert from "node:assert/strict";
import test from "node:test";

import { PDFDocument } from "pdf-lib";
import {
  GUIDE_PACKS,
  getGuidePack,
  isGuidePackStale,
} from "../app/lib/guide-packs.ts";
import {
  buildCompanionPacketText,
  buildReviewPacketPdf,
  buildReviewPacketText,
} from "../app/lib/packet-builder.ts";

const exactWords = "I disagree with item 4.\nMy wording stays exactly as entered, including line two.";
const context = {
  guide: GUIDE_PACKS["ca-fl-320-response"],
  generatedAt: "2026-07-21T08:00:00.000Z",
  companionNote: "Ask about accessible appearance options.",
  answers: {
    "identify-papers": "FL-300 Request for Order",
    "confirm-jurisdiction": "California case; no cross-state concern known",
    "response-in-own-words": exactWords,
    "requested-orders": ["Child custody", "Parenting time / visitation"],
  },
};

test("California and Utah guide packs remain jurisdiction-separated", () => {
  const california = getGuidePack("ca-fl-320-response");
  const utah = getGuidePack("ut-family-answer");
  assert.equal(california.jurisdiction, "california");
  assert.equal(utah.jurisdiction, "utah");
  assert.ok(california.sourceIds.every((id) => !id.startsWith("ut-")));
  assert.ok(utah.sourceIds.every((id) => !id.startsWith("ca-") && !id.startsWith("la-")));
  assert.equal(getGuidePack("cross-state"), null);
});

test("source review date disables a stale guide", () => {
  assert.equal(isGuidePackStale(context.guide, new Date("2026-07-21T00:00:00Z")), false);
  assert.equal(isGuidePackStale(context.guide, new Date("2026-09-01T00:00:00Z")), true);
});

test("text packets preserve exact words and mark unresolved sections", () => {
  const packet = buildReviewPacketText(context);
  assert.match(packet, /DRAFT - NOT FILED - HUMAN REVIEW REQUIRED/);
  assert.ok(packet.includes(exactWords));
  assert.match(packet, /UNRESOLVED OR EMPTY SECTIONS/);
  assert.match(packet, /Filed: no claim/);
  assert.doesNotMatch(packet, /filed successfully|served successfully/i);

  const companion = buildCompanionPacketText(context);
  assert.match(companion, /thefaythai\.companion\.v1/);
  assert.match(companion, /includesHiddenRecords": false/);
  assert.match(companion, /Ask about accessible appearance options/);
});

test("PDF packet wraps and paginates a long answer", async () => {
  const longContext = {
    ...context,
    answers: {
      ...context.answers,
      "facts-scaffold": Array.from({ length: 180 }, (_, index) => `Fact ${index + 1}: exact preparation language.`).join("\n"),
    },
  };
  const bytes = await buildReviewPacketPdf(longContext);
  assert.ok(bytes.byteLength > 2000);
  const pdf = await PDFDocument.load(bytes);
  assert.ok(pdf.getPageCount() > 1);
});
