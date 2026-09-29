/**
 * Turns authorized database rows and retrieved excerpts into the existing answer card.
 * Database facts and regulatory excerpts stay separate.
 * A model summary cannot introduce a number or an instruction override.
 */

import type { Citation, RegulatoryAnswer } from "./answer";
import { acceptModelSummary, EMPTY_REGULATORY_ANSWER } from "./answer";
import { instructionOverride, type QuestionPlan } from "./context-plan";
import { formatTimestamp } from "../sla/state";

const NOT_RECORDED = "Not recorded";

export type ProjectFact = {
  name: string;
  entityName: string | null;
  location: string | null;
  sector: string;
  pollutionCategory: string;
  investmentCr: string;
  stage: string;
  landClassification: string | null;
};

export type ApplicationFact = {
  title: string | null;
  status: string;
  submittedAt: string | null;
  slaDeadline: string | null;
};

export type ApprovalFact = { name: string; code: string; status: string; department: string | null; required: boolean };
export type DocumentFact = { name: string; fileName: string; category: string; status: string; uploadedAt: string };
export type WorkflowFact = { department: string; status: string; slaStartedAt: string | null; slaDeadline: string | null; slaCompletedAt: string | null };
export type QueryFact = { status: string; body: string; response: string | null };
export type InspectionFact = { status: string; scheduledAt: string; location: string | null; completedAt: string | null; reportRecorded: boolean };
export type CertificateFact = { status: string; number: string; issuedAt: string | null; validUntil: string | null };
export type RenewalFact = { status: string; dueAt: string | null };
export type SchemeFact = { name: string; claimStatus: string | null; eligibility: "eligible" | "not_eligible" | "insufficient_data" };
export type GrievanceFact = { subject: string; status: string; escalationRecorded: boolean };

export type FactBundle = {
  project: ProjectFact | null;
  application: ApplicationFact | null;
  approvals: ApprovalFact[];
  documents: DocumentFact[];
  workflows: WorkflowFact[];
  queries: QueryFact[];
  inspections: InspectionFact[];
  certificates: CertificateFact[];
  renewals: RenewalFact[];
  schemes: SchemeFact[];
  grievances: GrievanceFact[];
  citations: Citation[];
};

export function guardedSummary(summary: string | null, excerpts: string[]): string | null {
  if (!summary || instructionOverride(summary)) return null;
  return acceptModelSummary(summary, excerpts);
}

function documentLine(document: DocumentFact): string {
  const verification = document.status === "uploaded"
    ? "Uploaded — verification not recorded"
    : `Recorded status: ${document.status}. Verification is not inferred.`;
  return `${document.name} (${document.fileName}, ${document.category}): ${verification}`;
}

function layerText(plan: QuestionPlan, facts: FactBundle, summary: string | null): string[] {
  const blocks: string[] = [];
  const layers = new Set(plan.layers);

  if (layers.has("project")) {
    const project = facts.project;
    blocks.push(project
      ? [
        "Database fact.",
        `Project: ${project.entityName || project.name}.`,
        `Sector: ${project.sector}.`,
        `Pollution category: ${project.pollutionCategory}.`,
        `Land classification: ${project.landClassification ?? NOT_RECORDED}.`,
        `Investment (Cr): ${project.investmentCr}.`,
        `Stage: ${project.stage}.`,
        `Location: ${project.location ?? NOT_RECORDED}.`,
      ].join(" ")
      : "No project is recorded.");
  }

  if (layers.has("application")) {
    const application = facts.application;
    blocks.push(application
      ? `Database fact. Application status: ${application.status}. Title: ${application.title ?? NOT_RECORDED}. Submitted: ${formatTimestamp(application.submittedAt)}. This status is not an approval.`
      : "No application is recorded.");
  }

  if (layers.has("approval")) {
    blocks.push(facts.approvals.length === 0
      ? "No approval is recorded."
      : `Database fact. ${facts.approvals.map((approval) =>
        `${approval.name} (${approval.code}): status ${approval.status}; department ${approval.department ?? NOT_RECORDED}; ${approval.required ? "required" : "not required"}. This status is not an approval decision.`,
      ).join(" ")}`);
  }

  if (layers.has("document")) {
    blocks.push(facts.documents.length === 0
      ? "No document is recorded."
      : `Database fact. ${facts.documents.map(documentLine).join(" ")}`);
  }

  if (layers.has("workflow")) {
    blocks.push(facts.workflows.length === 0
      ? "No department workflow is recorded."
      : `Database fact. ${facts.workflows.map((workflow) =>
        `${workflow.department}: ${workflow.status}. A submitted workflow is not an approval.`,
      ).join(" ")}`);
  }

  if (layers.has("query")) {
    blocks.push(facts.queries.length === 0
      ? "No department query is recorded."
      : `Database fact. ${facts.queries.map((query) =>
        `Query status: ${query.status}. ${query.body} Response: ${query.response ?? NOT_RECORDED}.`,
      ).join(" ")}`);
  }

  if (layers.has("inspection")) {
    blocks.push(facts.inspections.length === 0
      ? "No inspection is recorded."
      : `Database fact. ${facts.inspections.map((inspection) =>
        `Inspection status: ${inspection.status}. Scheduled: ${formatTimestamp(inspection.scheduledAt)}. Location: ${inspection.location ?? NOT_RECORDED}. Completed: ${formatTimestamp(inspection.completedAt)}. Report: ${inspection.reportRecorded ? "recorded" : "not recorded"}.`,
      ).join(" ")}`);
  }

  if (layers.has("sla")) {
    const deadline = facts.workflows.find((workflow) => workflow.slaDeadline)?.slaDeadline
      ?? facts.application?.slaDeadline
      ?? null;
    blocks.push(deadline
      ? `Database fact. System-recorded SLA deadline: ${formatTimestamp(deadline)}. This is not a statutory deadline.`
      : "Database fact. System-recorded SLA: Not recorded. This is not a statutory deadline.");
  }

  if (layers.has("certificate")) {
    blocks.push(facts.certificates.length === 0
      ? "No certificate has been recorded."
      : `Database fact. ${facts.certificates.map((certificate) =>
        `Certificate status: ${certificate.status}. Number: ${certificate.number}. Issued: ${formatTimestamp(certificate.issuedAt)}. Valid until: ${formatTimestamp(certificate.validUntil)}.`,
      ).join(" ")}`);
  }

  if (layers.has("renewal")) {
    blocks.push(facts.renewals.length === 0
      ? "No renewal has been recorded."
      : `Database fact. ${facts.renewals.map((renewal) =>
        `Renewal status: ${renewal.status}. Due: ${formatTimestamp(renewal.dueAt)}.`,
      ).join(" ")}`);
  }

  if (layers.has("scheme")) {
    blocks.push(facts.schemes.length === 0
      ? "No scheme is configured."
      : `Database fact. ${facts.schemes.map((scheme) =>
        `${scheme.name}: eligibility ${scheme.eligibility.replace(/_/g, " ")}; claim ${scheme.claimStatus ?? "not recorded"}. A submitted claim is not scheme approval.`,
      ).join(" ")}`);
  }

  if (layers.has("grievance")) {
    blocks.push(facts.grievances.length === 0
      ? "No grievance is recorded."
      : `Database fact. ${facts.grievances.map((grievance) =>
        `${grievance.subject}: ${grievance.status}. Escalation path: ${grievance.escalationRecorded ? "an escalation is recorded" : "Not configured"}.`,
      ).join(" ")}`);
  }

  if (layers.has("regulatory")) {
    if (facts.citations.length === 0) {
      blocks.push("No verified regulatory source is recorded. Insufficient verified information.");
    } else {
      const quoted = facts.citations.map((citation) =>
        `Regulatory source fact. ${citation.sourceLabel}: ${citation.title}. ${citation.excerpt}`,
      ).join(" ");
      blocks.push(summary ? `${summary} ${quoted}` : quoted);
    }
  }

  return blocks;
}

export function composeAwareAnswer(input: {
  plan: QuestionPlan;
  facts: FactBundle;
  modelSummary: string | null;
  ambiguous?: boolean;
}): { answer: RegulatoryAnswer; limitations: string[] } {
  if (input.ambiguous) {
    return {
      answer: {
        ...EMPTY_REGULATORY_ANSWER,
        headline: "Please specify which project or application you mean.",
        subheadline: NOT_RECORDED,
        whyItApplies: "More than one project or application is recorded. No record was chosen automatically.",
        citations: [],
      },
      limitations: ["The question matches more than one owned project or application."],
    };
  }

  const excerpts = input.facts.citations.map((citation) => citation.excerpt);
  const summary = input.plan.needsRegulatory
    ? guardedSummary(input.modelSummary, excerpts)
    : null;
  const blocks = layerText(input.plan, input.facts, summary);
  const headline = blocks[0] ?? "Not recorded. Insufficient verified information.";
  const projectLabel = input.facts.project
    ? (input.facts.project.entityName || input.facts.project.name)
    : "No project is recorded";

  return {
    answer: {
      ...EMPTY_REGULATORY_ANSWER,
      headline,
      subheadline: input.plan.scope === "none" ? "Regulatory sources only" : projectLabel,
      whyItApplies: blocks.join("\n\n"),
      authority: {
        name: input.facts.citations[0]?.sourceLabel ?? NOT_RECORDED,
        office: NOT_RECORDED,
        act: NOT_RECORDED,
      },
      requiredDocs: input.facts.documents.map((document) => ({
        name: document.name,
        status: "Needs attention" as const,
        note: document.status === "uploaded"
          ? "Uploaded — verification not recorded"
          : `Recorded status: ${document.status}. Verification is not inferred.`,
      })),
      timeAndDependencies: {
        sla: input.plan.layers.includes("sla")
          ? (input.facts.workflows.find((workflow) => workflow.slaDeadline)?.slaDeadline
            ? `System-recorded SLA deadline: ${formatTimestamp(input.facts.workflows.find((workflow) => workflow.slaDeadline)?.slaDeadline ?? null)}. This is not a statutory deadline.`
            : "System-recorded SLA: Not recorded. This is not a statutory deadline.")
          : NOT_RECORDED,
        parallelWith: [NOT_RECORDED],
        criticalPath: NOT_RECORDED,
      },
      officialReference: {
        gazette: input.facts.citations[0]?.title ?? NOT_RECORDED,
        rule: input.facts.citations[0]?.excerpt.slice(0, 280) ?? NOT_RECORDED,
        portalUrl: input.facts.citations[0]?.sourceUri?.startsWith("https://")
          ? input.facts.citations[0].sourceUri
          : "/approvals",
      },
      citations: input.facts.citations,
    },
    limitations: input.plan.needsRegulatory && input.facts.citations.length === 0
      ? ["No verified regulatory source was retrieved."]
      : [],
  };
}
