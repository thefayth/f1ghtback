export const SOURCE_MANIFEST_VERSION = "2026.07.20.1";

export const OFFICIAL_SOURCES = {
  "ca-self-help": {
    title: "California Courts Self-Help",
    publisher: "Judicial Branch of California",
    url: "https://selfhelp.courts.ca.gov/",
    jurisdiction: "california",
    category: "court-help",
    checkedAt: "2026-07-19",
    reviewBy: "2026-08-18",
    status: "active",
  },
  "ca-court-forms": {
    title: "Judicial Council Court Forms",
    publisher: "Judicial Branch of California",
    url: "https://courts.ca.gov/forms-rules/court-forms",
    jurisdiction: "california",
    category: "forms",
    checkedAt: "2026-07-21",
    reviewBy: "2026-08-20",
    status: "active",
  },
  "la-family-law": {
    title: "Los Angeles Superior Court Family Law",
    publisher: "Superior Court of Los Angeles County",
    url: "https://www.lacourt.ca.gov/pages/lp/family-law",
    jurisdiction: "california",
    category: "local-court",
    checkedAt: "2026-07-19",
    reviewBy: "2026-08-18",
    status: "active",
  },
  "ca-legal-help": {
    title: "Free or low-cost legal help",
    publisher: "California Courts Self-Help",
    url: "https://selfhelp.courts.ca.gov/get-free-or-low-cost-legal-help",
    jurisdiction: "california",
    category: "legal-help",
    checkedAt: "2026-07-19",
    reviewBy: "2026-10-17",
    status: "active",
  },
  "ca-rfo-response": {
    title: "How to respond to a Request for Order",
    publisher: "California Courts Self-Help",
    url: "https://selfhelp.courts.ca.gov/request-for-order/respond/select-order-type",
    jurisdiction: "california",
    category: "procedure",
    checkedAt: "2026-07-20",
    reviewBy: "2026-08-19",
    status: "active",
  },
  "ca-fl-320": {
    title: "Responsive Declaration to Request for Order (FL-320)",
    publisher: "Judicial Branch of California",
    url: "https://selfhelp.courts.ca.gov/jcc-form/FL-320",
    jurisdiction: "california",
    category: "form",
    checkedAt: "2026-07-20",
    reviewBy: "2026-08-19",
    status: "active",
  },
  "ca-rule-5-92": {
    title: "California Rule of Court 5.92",
    publisher: "Judicial Branch of California",
    url: "https://courts.ca.gov/cms/rules/index/five/rule5_92",
    jurisdiction: "california",
    category: "rule",
    checkedAt: "2026-07-21",
    reviewBy: "2026-08-20",
    status: "active",
  },
  "ut-family": {
    title: "Utah Courts Family Resources",
    publisher: "Utah State Courts",
    url: "https://www.utcourts.gov/en/self-help/case-categories/family.html",
    jurisdiction: "utah",
    category: "court-help",
    checkedAt: "2026-07-19",
    reviewBy: "2026-08-18",
    status: "active",
  },
  "ut-protective-orders": {
    title: "Utah Protective Orders",
    publisher: "Utah State Courts",
    url: "https://www.utcourts.gov/en/self-help/case-categories/protect-order/protective-orders.html",
    jurisdiction: "utah",
    category: "procedure",
    checkedAt: "2026-07-19",
    reviewBy: "2026-08-18",
    status: "active",
  },
  "ut-mypaperwork": {
    title: "Utah MyPaperwork",
    publisher: "Utah State Courts",
    url: "https://www.utcourts.gov/en/self-help/services/mycase/mypaperwork.html",
    jurisdiction: "utah",
    category: "form-builder",
    checkedAt: "2026-07-19",
    reviewBy: "2026-08-18",
    status: "active",
  },
  "ut-legal-help": {
    title: "Finding Legal Help in Utah",
    publisher: "Utah State Courts",
    url: "https://www.utcourts.gov/en/self-help/legal-help/finding-legal-help/legal-assist.html",
    jurisdiction: "utah",
    category: "legal-help",
    checkedAt: "2026-07-19",
    reviewBy: "2026-10-17",
    status: "active",
  },
  "ut-family-answer": {
    title: "Answering a Complaint or Petition",
    publisher: "Utah State Courts",
    url: "https://www.utcourts.gov/en/self-help/case-categories/family/answer.html",
    jurisdiction: "utah",
    category: "procedure",
    checkedAt: "2026-07-20",
    reviewBy: "2026-08-19",
    status: "active",
  },
  "ut-answer-form": {
    title: "Answer - Family (1008FA)",
    publisher: "Utah State Courts",
    url: "https://apps.utcourts.gov/aem-services/aem/forms/template/1008FA",
    jurisdiction: "utah",
    category: "form",
    checkedAt: "2026-07-20",
    reviewBy: "2026-08-19",
    status: "active",
  },
  "ada-courts": {
    title: "ADA information for state and local courts",
    publisher: "U.S. Department of Justice",
    url: "https://www.ada.gov/topics/title-ii/",
    jurisdiction: "federal",
    category: "accessibility",
    checkedAt: "2026-07-19",
    reviewBy: "2026-10-17",
    status: "active",
  },
} as const satisfies Record<
  string,
  {
    title: string;
    publisher: string;
    url: string;
    jurisdiction: "california" | "utah" | "federal";
    category: string;
    checkedAt: string;
    reviewBy: string;
    status: "active" | "held";
  }
>;

export type SourceId = keyof typeof OFFICIAL_SOURCES;

export function sourceList(sourceIds: readonly SourceId[]) {
  return sourceIds.map((id) => ({ id, ...OFFICIAL_SOURCES[id] }));
}

export function isSourceStale(sourceId: SourceId, now = new Date()) {
  const source = OFFICIAL_SOURCES[sourceId];
  const reviewBy = new Date(`${source.reviewBy}T23:59:59.999Z`);
  return source.status !== "active" || Number.isNaN(reviewBy.valueOf()) || now > reviewBy;
}
