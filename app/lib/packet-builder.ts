import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { GuidePack, GuideStep } from "./guide-packs.ts";
import { OFFICIAL_SOURCES, SOURCE_MANIFEST_VERSION } from "./source-manifest.ts";

export type GuideAnswer = string | string[] | Record<string, string>;
export type GuideAnswers = Record<string, GuideAnswer>;

export type PacketContext = {
  guide: GuidePack;
  answers: GuideAnswers;
  generatedAt: string;
  companionNote?: string;
};

function answerLines(step: GuideStep, answer: GuideAnswer | undefined) {
  if (typeof answer === "string") return answer.trim() ? answer.trim().split(/\r?\n/) : ["Not provided."];
  if (Array.isArray(answer)) return answer.length ? answer.map((item) => `- ${item}`) : ["Not provided."];
  if (answer && typeof answer === "object") {
    const entries = Object.entries(answer).filter(([, value]) => value.trim());
    return entries.length ? entries.map(([key, value]) => `${key}: ${value}`) : ["Not provided."];
  }
  return ["Not provided."];
}

function missingSteps(context: PacketContext) {
  return context.guide.steps
    .filter((step) => {
      const answer = context.answers[step.id];
      if (typeof answer === "string") return !answer.trim();
      if (Array.isArray(answer)) return answer.length === 0;
      if (answer && typeof answer === "object") {
        return Object.values(answer).every((value) => !value.trim());
      }
      return true;
    })
    .map((step) => step.title);
}

export function buildReviewPacketText(context: PacketContext) {
  const lines = [
    "f1ghtback Guided Filing and Packet Studio",
    "DRAFT - NOT FILED - HUMAN REVIEW REQUIRED",
    "",
    `Guide: ${context.guide.title}`,
    `Jurisdiction: ${context.guide.jurisdiction}`,
    `Guide version: ${context.guide.version}`,
    `Source manifest: ${SOURCE_MANIFEST_VERSION}`,
    `Generated locally: ${context.generatedAt}`,
    "",
    "BOUNDARY",
    "This is a preparation and review packet, not a court form, legal advice, proof of filing, proof of service, or an attorney-client relationship.",
    "The answers below were assembled in the browser and were not sent to f1ghtback, GPT, Sites, D1, Listen Up, or thefaythai.",
    "",
    "FORM-MATCHED ANSWERS",
  ];

  for (const [index, step] of context.guide.steps.entries()) {
    lines.push(
      "",
      `${index + 1}. ${step.title}`,
      `Form / packet target: ${step.formTarget}`,
      ...answerLines(step, context.answers[step.id]),
    );
  }

  const missing = missingSteps(context);
  lines.push(
    "",
    "UNRESOLVED OR EMPTY SECTIONS",
    ...(missing.length ? missing.map((item) => `- ${item}`) : ["- None marked empty. Human review is still required."]),
    "",
    "HUMAN REVIEW CHECK",
    "- Confirm jurisdiction and the correct response route.",
    "- Confirm timing from the papers and current court rules.",
    "- Confirm forms, attachments, filing, service, safety, and accessibility.",
    "- Review every factual statement before signing under penalty of perjury.",
    "- Save court acceptance and service receipts separately.",
    "",
    "OFFICIAL SOURCES",
    ...context.guide.sourceIds.flatMap((sourceId) => {
      const source = OFFICIAL_SOURCES[sourceId];
      return [
        `- ${source.title}`,
        `  ${source.publisher} | checked ${source.checkedAt} | review by ${source.reviewBy}`,
        `  ${source.url}`,
      ];
    }),
    "",
    "STATUS RECEIPT",
    "Preparation: draft",
    "Human review: required",
    "Filed: no claim",
    "Served: no claim",
    "Court accepted: no claim",
  );

  return lines.join("\n");
}

export function buildCompanionPacketText(context: PacketContext) {
  const envelope = {
    format: "thefaythai.companion.v1",
    purpose: "legal-preparation",
    jurisdiction: context.guide.jurisdiction,
    guideId: context.guide.id,
    guideVersion: context.guide.version,
    sourceManifestVersion: SOURCE_MANIFEST_VERSION,
    includesHiddenRecords: false,
    copiedByUser: true,
    status: "local-draft-not-filed",
  };
  return [
    "F1GHTBACK COMPANION PACKET",
    JSON.stringify(envelope, null, 2),
    "",
    "Review the text below before choosing whether to paste or share it.",
    "Nothing is sent automatically.",
    ...(context.companionNote?.trim()
      ? ["", "USER-CONTROLLED COMPANION NOTE", context.companionNote.trim()]
      : []),
    "",
    buildReviewPacketText(context),
  ].join("\n");
}

function wrapText(text: string, width = 92) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function pdfSafeText(value: string) {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "?");
}

export async function buildReviewPacketPdf(context: PacketContext) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const text = buildReviewPacketText(context);
  const paragraphs = text.split(/\r?\n/);
  let page = pdf.addPage([612, 792]);
  let y = 748;

  function addPage() {
    page = pdf.addPage([612, 792]);
    y = 748;
  }

  for (const paragraph of paragraphs) {
    const isHeading = /^[A-Z][A-Z /-]{4,}$/.test(paragraph) || /^\d+\. /.test(paragraph);
    const font = isHeading ? bold : regular;
    const size = isHeading ? 11.5 : 9.5;
    const color = isHeading ? rgb(0.36, 0.04, 0.17) : rgb(0.12, 0.11, 0.12);
    for (const line of wrapText(pdfSafeText(paragraph))) {
      if (y < 52) addPage();
      page.drawText(line, { x: 45, y, size, font, color });
      y -= isHeading ? 16 : 13;
    }
    y -= paragraph ? 3 : 7;
  }

  const pages = pdf.getPages();
  pages.forEach((currentPage, index) => {
    currentPage.drawText(`DRAFT - NOT FILED | page ${index + 1} of ${pages.length}`, {
      x: 45,
      y: 24,
      size: 8,
      font: bold,
      color: rgb(0.46, 0.17, 0.25),
    });
  });

  return pdf.save();
}
