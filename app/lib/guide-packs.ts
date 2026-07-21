import {
  SOURCE_MANIFEST_VERSION,
  isSourceStale,
  type SourceId,
} from "./source-manifest.ts";

export const GUIDE_IDS = ["ca-fl-320-response", "ut-family-answer"] as const;
export type GuideId = (typeof GUIDE_IDS)[number];

export const GUIDE_DETAIL_LEVELS = ["brief", "full"] as const;
export type GuideDetailLevel = (typeof GUIDE_DETAIL_LEVELS)[number];

export type GuideStepKind =
  | "single-choice"
  | "date"
  | "multi-choice"
  | "long-text"
  | "paragraph-map"
  | "checklist";

export type GuideStep = {
  id: string;
  title: string;
  prompt: string;
  explanation: string;
  whyItMatters: string;
  watchFor: string[];
  sourceIds: SourceId[];
  kind: GuideStepKind;
  formTarget: string;
  options?: Array<{ value: string; label: string }>;
  checklist?: string[];
  placeholder?: string;
  maxLength?: number;
};

export type GuidePack = {
  id: GuideId;
  version: string;
  sourceManifestVersion: string;
  jurisdiction: "california" | "utah";
  title: string;
  shortTitle: string;
  summary: string;
  officialFormTargets: string[];
  checkedAt: string;
  reviewBy: string;
  sourceIds: SourceId[];
  steps: GuideStep[];
};

const californiaSteps: GuideStep[] = [
  {
    id: "identify-papers",
    title: "Identify the papers",
    prompt: "What document are you responding to?",
    explanation: "This walkthrough is only for a California Request for Order, form FL-300. Use the title printed on the first page rather than guessing from the subject.",
    whyItMatters: "A different document may require a different response process or form.",
    watchFor: ["Do not continue if the paper is a DV-100, summons, appeal, or something you cannot identify.", "Keep every page together for human review."],
    sourceIds: ["ca-rfo-response", "ca-fl-320"],
    kind: "single-choice",
    formTarget: "Routing check before FL-320",
    options: [
      { value: "fl-300", label: "FL-300 Request for Order" },
      { value: "different-or-unsure", label: "Different document or unsure" },
    ],
  },
  {
    id: "confirm-jurisdiction",
    title: "Confirm the court connection",
    prompt: "Is this an existing California case without a cross-state uncertainty?",
    explanation: "This coach does not decide jurisdiction. It only prepares a California response when the case and form are already identified.",
    whyItMatters: "Cross-state facts can change which court has authority and should be reviewed before using state-specific forms.",
    watchFor: ["An order or open case in another state.", "A child, parent, or recent move connected to another state."],
    sourceIds: ["ca-legal-help", "ca-rfo-response"],
    kind: "single-choice",
    formTarget: "Jurisdiction review hold",
    options: [
      { value: "california-confirmed", label: "California case; no cross-state concern known" },
      { value: "cross-state-or-unsure", label: "Cross-state connection or unsure" },
    ],
  },
  {
    id: "timing-review",
    title: "Record the service date",
    prompt: "What date did you receive or get served with the papers?",
    explanation: "Record the date exactly as you understand it. f1ghtback will not calculate a deadline from it.",
    whyItMatters: "A court self-help center, legal aid provider, or lawyer can use the date and papers to confirm timing.",
    watchFor: ["Do not rely on a date calculated by this tool.", "If timing may be urgent, contact human help today."],
    sourceIds: ["ca-rfo-response", "ca-rule-5-92"],
    kind: "date",
    formTarget: "Human timing review",
  },
  {
    id: "requested-orders",
    title: "Match the requested orders",
    prompt: "Which subjects are checked or requested in the FL-300?",
    explanation: "FL-320 follows the subjects raised in the Request for Order. Select only what you can see in the papers.",
    whyItMatters: "A response is not the place to silently add an unrelated request.",
    watchFor: ["Financial requests may require additional current financial forms.", "Custody or parenting-time requests may involve additional local steps."],
    sourceIds: ["ca-rfo-response", "ca-fl-320", "ca-rule-5-92"],
    kind: "multi-choice",
    formTarget: "FL-320 items 1-9",
    options: [
      { value: "custody", label: "Child custody" },
      { value: "parenting-time", label: "Parenting time / visitation" },
      { value: "child-support", label: "Child support" },
      { value: "spousal-support", label: "Spousal or partner support" },
      { value: "property", label: "Property control" },
      { value: "fees", label: "Attorney fees and costs" },
      { value: "other", label: "Other order shown on the papers" },
      { value: "unsure", label: "Unsure" },
    ],
  },
  {
    id: "response-in-own-words",
    title: "State your response",
    prompt: "In your exact words, what do you agree with, disagree with, or want reviewed?",
    explanation: "Write for a human reviewer. Keep your wording factual and separate what you observed from what you believe it means.",
    whyItMatters: "The packet preserves your words and shows where they may transfer to the responsive declaration.",
    watchFor: ["Do not paste child records, private evidence, or protected addresses into a public or shared device.", "Do not make accusations broader than the facts you can explain."],
    sourceIds: ["ca-fl-320", "ca-rule-5-92"],
    kind: "long-text",
    formTarget: "FL-320 items 1-9 response notes",
    placeholder: "Use your own words. This text stays in this browser tab.",
    maxLength: 6000,
  },
  {
    id: "facts-scaffold",
    title: "Prepare the supporting facts",
    prompt: "What facts should a human reviewer consider, in date order if possible?",
    explanation: "Use short factual paragraphs. Include dates when known and identify uncertainty instead of filling gaps.",
    whyItMatters: "FL-320 includes a facts section, and longer material may need an attachment reviewed for relevance and length.",
    watchFor: ["Separate first-hand facts from information someone else reported.", "Use exhibit labels, not pasted evidence bodies."],
    sourceIds: ["ca-fl-320", "ca-rule-5-92"],
    kind: "long-text",
    formTarget: "FL-320 item 10 / reviewed attachment",
    placeholder: "Date or sequence - what happened - how you know - what needs review.",
    maxLength: 12000,
  },
  {
    id: "exhibit-index",
    title: "Build an exhibit index",
    prompt: "List possible supporting items by label only.",
    explanation: "Name each item without uploading it, for example: Exhibit A - email dated [date].",
    whyItMatters: "A reviewer can assess relevance and privacy without putting source evidence into this public app.",
    watchFor: ["Do not upload or paste evidence.", "Flag sealed, child-private, medical, school, or protected-address material."],
    sourceIds: ["ca-rfo-response", "ca-fl-320"],
    kind: "long-text",
    formTarget: "Private exhibit index scaffold",
    placeholder: "Exhibit label - neutral description - privacy flag.",
    maxLength: 6000,
  },
  {
    id: "human-review-questions",
    title: "Prepare human-review questions",
    prompt: "What do you need court self-help, legal aid, or a lawyer to confirm?",
    explanation: "Focus on form choice, attachments, timing, filing, service, safety, accessibility, and the limits of the requested orders.",
    whyItMatters: "A focused question list can make a short appointment more useful.",
    watchFor: ["Ask for an accommodation if the process is inaccessible.", "Ask directly if a protection or cross-state issue needs a different route."],
    sourceIds: ["ca-legal-help", "ada-courts", "la-family-law"],
    kind: "long-text",
    formTarget: "Human-review cover sheet",
    placeholder: "What must be confirmed before I sign, file, serve, or attend the hearing?",
    maxLength: 4000,
  },
  {
    id: "file-serve-track",
    title: "Track filing and service",
    prompt: "Which preparation steps have you personally confirmed?",
    explanation: "Checking a box records your preparation only. It does not mean the court accepted a filing or service was legally sufficient.",
    whyItMatters: "A receipt helps separate prepared, reviewed, filed, served, and accepted states.",
    watchFor: ["Confirm local filing and service requirements with an official or qualified human.", "Save court and service receipts outside this browser."],
    sourceIds: ["ca-rfo-response", "la-family-law", "ca-rule-5-92"],
    kind: "checklist",
    formTarget: "Filing, service, hearing, and receipt tracker",
    checklist: [
      "I identified the document and court.",
      "I asked a human to confirm timing and required attachments.",
      "I reviewed filing instructions from the court.",
      "I reviewed service instructions and proof requirements.",
      "I know where I will save filing and service receipts.",
    ],
  },
];

const utahSteps: GuideStep[] = [
  {
    id: "identify-papers",
    title: "Identify the papers",
    prompt: "What family-court papers did you receive?",
    explanation: "The Utah answer process begins by identifying the summons and the complaint or petition by their printed titles.",
    whyItMatters: "A motion, protective-order request, or other paper may require a different response route.",
    watchFor: ["Keep the summons and petition together.", "Stop if the title does not match the choices below."],
    sourceIds: ["ut-family-answer", "ut-family"],
    kind: "single-choice",
    formTarget: "Routing check before Answer - Family",
    options: [
      { value: "new-family-case", label: "Summons plus divorce, custody, or parentage petition" },
      { value: "petition-to-modify", label: "Petition to modify an existing family order" },
      { value: "different-or-unsure", label: "Different document or unsure" },
    ],
  },
  {
    id: "confirm-jurisdiction",
    title: "Confirm the court connection",
    prompt: "Is this a Utah case without a cross-state uncertainty?",
    explanation: "This coach does not decide jurisdiction. It prepares notes for a Utah answer only when the papers already identify a Utah case.",
    whyItMatters: "Another state or existing order can require jurisdiction review before using state-specific forms.",
    watchFor: ["An order or open case in another state.", "Service outside Utah or a recent interstate move."],
    sourceIds: ["ut-legal-help", "ut-family-answer"],
    kind: "single-choice",
    formTarget: "Jurisdiction review hold",
    options: [
      { value: "utah-confirmed", label: "Utah case; no cross-state concern known" },
      { value: "cross-state-or-unsure", label: "Cross-state connection or unsure" },
    ],
  },
  {
    id: "timing-review",
    title: "Record the service date",
    prompt: "What date did you receive or get served with the papers?",
    explanation: "Record the date for human review. f1ghtback will not calculate your response deadline.",
    whyItMatters: "The summons and official Utah guidance should be reviewed together to confirm timing.",
    watchFor: ["Do not rely on a deadline calculated by this tool.", "If timing may be urgent, contact Utah self-help or legal help today."],
    sourceIds: ["ut-family-answer", "ut-legal-help"],
    kind: "date",
    formTarget: "Human timing review",
  },
  {
    id: "paragraph-map",
    title: "Sort the petition paragraphs",
    prompt: "List the numbered paragraphs you agree with, disagree with, or cannot answer yet.",
    explanation: "Read each numbered paragraph in the complaint or petition and sort only its paragraph number.",
    whyItMatters: "The official Answer - Family structure separates agreement, disagreement, and insufficient information.",
    watchFor: ["Disagree if any part of a paragraph is disputed, then explain it for review.", "Do not invent an answer when you lack information."],
    sourceIds: ["ut-family-answer", "ut-answer-form"],
    kind: "paragraph-map",
    formTarget: "1008FA paragraphs 1-3 / MyPaperwork interview",
  },
  {
    id: "response-in-own-words",
    title: "Explain your responses",
    prompt: "In your exact words, what should a human reviewer understand about the paragraphs you marked?",
    explanation: "Refer to petition paragraph numbers and keep observations separate from conclusions.",
    whyItMatters: "The preparation packet preserves the connection between the petition and your explanation.",
    watchFor: ["Do not paste child-private records or evidence bodies.", "Identify uncertainty rather than filling it with assumptions."],
    sourceIds: ["ut-family-answer", "ut-answer-form"],
    kind: "long-text",
    formTarget: "1008FA explanation of responses",
    placeholder: "Petition paragraph number - your exact response - what needs human review.",
    maxLength: 8000,
  },
  {
    id: "requested-result",
    title: "Prepare the requested result",
    prompt: "What result or question do you want a human reviewer to consider?",
    explanation: "Describe the practical result you want reviewed without assuming the answer form can request every kind of relief.",
    whyItMatters: "Counterpetitions, affirmative defenses, and unrelated requests can have separate requirements and consequences.",
    watchFor: ["Do not select a counterpetition or defense based only on this tool.", "Ask whether fees or additional disclosures apply."],
    sourceIds: ["ut-family-answer", "ut-mypaperwork", "ut-legal-help"],
    kind: "long-text",
    formTarget: "1008FA optional explanation/request and review questions",
    placeholder: "What I want reviewed, why, and what I do not yet understand.",
    maxLength: 6000,
  },
  {
    id: "document-index",
    title: "Build a document index",
    prompt: "List possible supporting documents by label only.",
    explanation: "Create a neutral index without uploading documents or copying their private contents.",
    whyItMatters: "A reviewer can identify what is relevant, required, private, or missing.",
    watchFor: ["Flag child, school, medical, financial, and protected-address records.", "Do not treat an index as evidence filed with the court."],
    sourceIds: ["ut-family-answer", "ut-legal-help"],
    kind: "long-text",
    formTarget: "Private document index scaffold",
    placeholder: "Document label - date - neutral description - privacy flag.",
    maxLength: 6000,
  },
  {
    id: "human-review-questions",
    title: "Prepare human-review questions",
    prompt: "What must Utah self-help, legal aid, or a lawyer confirm?",
    explanation: "Ask about the response tool, counterpetition, timing, filing, service, disclosures, safety, and accessibility.",
    whyItMatters: "The official Utah page routes new family answers through MyPaperwork and identifies separate filing and service steps.",
    watchFor: ["Ask which route applies to a new case versus a modification.", "Ask for disability or language access when needed."],
    sourceIds: ["ut-family-answer", "ut-mypaperwork", "ut-legal-help", "ada-courts"],
    kind: "long-text",
    formTarget: "Human-review cover sheet",
    placeholder: "What must be confirmed before I sign, file, send copies, or attend court?",
    maxLength: 4000,
  },
  {
    id: "file-serve-track",
    title: "Track filing and service",
    prompt: "Which preparation steps have you personally confirmed?",
    explanation: "These checks document preparation only. They do not prove filing, service, or court acceptance.",
    whyItMatters: "The official process distinguishes preparing an answer, filing it, sending copies, and keeping proof.",
    watchFor: ["Use MyPaperwork when the official guidance directs you there.", "Save filed copies and service proof outside this browser."],
    sourceIds: ["ut-family-answer", "ut-mypaperwork"],
    kind: "checklist",
    formTarget: "Filing, service, disclosure, and receipt tracker",
    checklist: [
      "I identified the summons and petition.",
      "I asked a human to confirm timing and the correct answer route.",
      "I reviewed MyPaperwork or the official form instructions.",
      "I reviewed filing and service requirements.",
      "I know where I will save filed copies and service proof.",
    ],
  },
];

export const GUIDE_PACKS: Record<GuideId, GuidePack> = {
  "ca-fl-320-response": {
    id: "ca-fl-320-response",
    version: "1.0.0",
    sourceManifestVersion: SOURCE_MANIFEST_VERSION,
    jurisdiction: "california",
    title: "California FL-320 response coach",
    shortTitle: "California FL-320",
    summary: "Prepare a form-matched review packet for responding to a California Request for Order without filing or sending anything.",
    officialFormTargets: ["FL-300 Request for Order", "FL-320 Responsive Declaration to Request for Order"],
    checkedAt: "2026-07-20",
    reviewBy: "2026-08-19",
    sourceIds: ["ca-rfo-response", "ca-fl-320", "ca-rule-5-92", "ca-legal-help", "la-family-law", "ada-courts"],
    steps: californiaSteps,
  },
  "ut-family-answer": {
    id: "ut-family-answer",
    version: "1.0.0",
    sourceManifestVersion: SOURCE_MANIFEST_VERSION,
    jurisdiction: "utah",
    title: "Utah family answer coach",
    shortTitle: "Utah family answer",
    summary: "Prepare paragraph responses and review questions before using Utah MyPaperwork or the official family answer process.",
    officialFormTargets: ["MyPaperwork family answer interview", "1008FA Answer - Family"],
    checkedAt: "2026-07-20",
    reviewBy: "2026-08-19",
    sourceIds: ["ut-family-answer", "ut-mypaperwork", "ut-answer-form", "ut-legal-help", "ada-courts"],
    steps: utahSteps,
  },
};

export function getGuidePack(id: string): GuidePack | null {
  return GUIDE_IDS.includes(id as GuideId) ? GUIDE_PACKS[id as GuideId] : null;
}

export function getGuideStep(guideId: string, stepId: string) {
  return getGuidePack(guideId)?.steps.find((step) => step.id === stepId) ?? null;
}

export function isGuidePackStale(guide: GuidePack, now = new Date()) {
  const reviewBy = new Date(`${guide.reviewBy}T23:59:59.999Z`);
  return (
    Number.isNaN(reviewBy.valueOf()) ||
    now > reviewBy ||
    guide.sourceIds.some((sourceId) => isSourceStale(sourceId, now))
  );
}
