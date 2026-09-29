/**
 * Answers are assembled from retrieved excerpts and recorded application facts.
 * A model summary is kept only when every number in it already appears in those sources.
 * Fees, SLAs, and gazette citations are not invented.
 */

export type Citation = {
  chunkId: string;
  documentId: string;
  title: string;
  sourceLabel: string;
  sourceUri: string | null;
  excerpt: string;
};

export type RecordedContext = {
  projectLabel: string | null;
  location: string | null;
  applicationStatus: string | null;
  approvals: string[];
  documents: { name: string; status: string }[];
  workflows: string[];
};

export type RegulatoryAnswer = {
  headline: string;
  subheadline: string;
  whyItApplies: string;
  authority: { name: string; office: string; act: string };
  requiredDocs: { name: string; status: "Verified" | "Needs attention" | "Missing"; note: string }[];
  timeAndDependencies: { sla: string; parallelWith: string[]; criticalPath: string };
  officialReference: { gazette: string; rule: string; portalUrl: string };
  atAGlance: {
    estimatedTime: string;
    applicationFee: string;
    readiness: string;
    riskLevel: string;
  };
  actionLabel: string;
  actionUrl: string;
  citations: Citation[];
};

const NOT_RECORDED = "Not recorded";

export const EMPTY_REGULATORY_ANSWER: RegulatoryAnswer = {
  headline: "No question has been sent.",
  subheadline: "An answer is shown only after a question is checked against recorded sources.",
  whyItApplies: NOT_RECORDED,
  authority: { name: NOT_RECORDED, office: NOT_RECORDED, act: NOT_RECORDED },
  requiredDocs: [],
  timeAndDependencies: { sla: NOT_RECORDED, parallelWith: [NOT_RECORDED], criticalPath: NOT_RECORDED },
  officialReference: { gazette: NOT_RECORDED, rule: NOT_RECORDED, portalUrl: "/approvals" },
  atAGlance: {
    estimatedTime: NOT_RECORDED,
    applicationFee: NOT_RECORDED,
    readiness: NOT_RECORDED,
    riskLevel: NOT_RECORDED,
  },
  actionLabel: "View approvals",
  actionUrl: "/approvals",
  citations: [],
};

function numbersIn(text: string): string[] {
  return text.match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
}

/** Reject a summary that introduces a number the sources do not contain. */
export function acceptModelSummary(summary: string, sources: string[]): string | null {
  const cleaned = summary.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  const sourceText = sources.join("\n");
  const allowed = new Set(numbersIn(sourceText));
  for (const value of numbersIn(cleaned)) {
    if (!allowed.has(value)) return null;
  }
  return cleaned;
}

export function buildGroundedAnswer(input: {
  citations: Citation[];
  context: RecordedContext;
  modelSummary: string | null;
}): RegulatoryAnswer {
  const sourceTexts = input.citations.map((citation) =>
    `${citation.title}\n${citation.sourceLabel}\n${citation.excerpt}`,
  );
  const summary = input.modelSummary
    ? acceptModelSummary(input.modelSummary, sourceTexts)
    : null;
  const first = input.citations[0] ?? null;
  const projectLabel = input.context.projectLabel ?? "No project is recorded";
  const documents = input.context.documents.map((document) => ({
    name: document.name,
    status: "Needs attention" as const,
    note: `Recorded status: ${document.status}. This is not official verification.`,
  }));

  if (!first) {
    return {
      ...EMPTY_REGULATORY_ANSWER,
      headline: "No regulatory source is recorded for this question.",
      subheadline: projectLabel,
      whyItApplies: "The knowledge base has no matching excerpt. A conclusion is not inferred.",
      requiredDocs: documents,
      officialReference: {
        gazette: NOT_RECORDED,
        rule: NOT_RECORDED,
        portalUrl: "/approvals",
      },
      citations: [],
    };
  }

  return {
    headline: summary ?? "The recorded excerpts do not state a conclusion beyond the text below.",
    subheadline: projectLabel,
    whyItApplies: input.citations.map((citation) => citation.excerpt).join("\n\n"),
    authority: {
      name: first.sourceLabel,
      office: NOT_RECORDED,
      act: NOT_RECORDED,
    },
    requiredDocs: documents,
    timeAndDependencies: {
      sla: NOT_RECORDED,
      parallelWith: [NOT_RECORDED],
      criticalPath: input.context.workflows.length > 0
        ? input.context.workflows.join("; ")
        : NOT_RECORDED,
    },
    officialReference: {
      gazette: first.title,
      rule: first.excerpt.slice(0, 280),
      portalUrl: first.sourceUri && first.sourceUri.startsWith("https://") ? first.sourceUri : "/approvals",
    },
    atAGlance: {
      estimatedTime: NOT_RECORDED,
      applicationFee: NOT_RECORDED,
      readiness: NOT_RECORDED,
      riskLevel: NOT_RECORDED,
    },
    actionLabel: "View approvals",
    actionUrl: "/approvals",
    citations: input.citations,
  };
}
