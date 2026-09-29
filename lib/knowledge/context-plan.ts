/**
 * Chooses which recorded layers a question needs.
 * Regulatory retrieval is separate from database facts.
 */

export type ContextLayer =
  | "project"
  | "application"
  | "approval"
  | "document"
  | "workflow"
  | "query"
  | "inspection"
  | "sla"
  | "certificate"
  | "renewal"
  | "scheme"
  | "grievance"
  | "regulatory";

export type QuestionPlan = {
  layers: ContextLayer[];
  scope: "none" | "project" | "application";
  needsRegulatory: boolean;
};

const RECORD_LAYERS = new Set<ContextLayer>([
  "project",
  "application",
  "approval",
  "document",
  "workflow",
  "query",
  "inspection",
  "sla",
  "certificate",
  "renewal",
  "scheme",
  "grievance",
]);

const APPLICATION_LAYERS = new Set<ContextLayer>([
  "application",
  "approval",
  "document",
  "workflow",
  "query",
  "inspection",
  "sla",
  "certificate",
  "renewal",
  "grievance",
]);

export function planQuestion(question: string): QuestionPlan {
  const text = question.toLowerCase();
  const layers = new Set<ContextLayer>();

  if (/pollution|sector|my investment|total investment|investment amount|land classification|location|project stage|\bstage\b|entity name|project name|\bmy project\b|\bthis project\b/.test(text) || (/\bmy\b/.test(text) && /\bproject\b/.test(text))) {
    layers.add("project");
  }
  if (/application status|status of my application|current status|why.{0,40}pending|still pending|\bmy status\b/.test(text)) {
    layers.add("application");
  }
  if (/approval|pending approval|checklist|consent|noc/.test(text)) layers.add("approval");
  if (/document|uploaded|upload/.test(text)) layers.add("document");
  if (/\bquer(y|ies)\b|responded|response/.test(text)) layers.add("query");
  if (/inspection|scheduled visit|site visit/.test(text)) layers.add("inspection");
  if (/\bsla\b|deadline|how long|overdue/.test(text)) layers.add("sla");
  if (/certificate|licen[cs]e|expir/.test(text)) layers.add("certificate");
  if (/renewal|renew/.test(text)) layers.add("renewal");
  if (/scheme|incentive|eligib/.test(text)) layers.add("scheme");
  if (/grievance|escalat/.test(text)) layers.add("grievance");
  if (/why.{0,40}pending|still pending/.test(text)) {
    layers.add("application");
    layers.add("approval");
    layers.add("workflow");
    layers.add("query");
    layers.add("inspection");
    layers.add("sla");
  }
  if (/\b(fee|gazette|statute|statutory|regulation|act|polic(?:y|ies)|incentives?|subsid(?:y|ies))\b|\blegal requirement\b/.test(text)) {
    layers.add("regulatory");
  }
  if (layers.has("sla")) layers.add("regulatory");

  if (layers.size === 0) layers.add("regulatory");

  const needsRegulatory = layers.has("regulatory");
  const recordLayers = [...layers].filter((layer) => RECORD_LAYERS.has(layer));
  const scope = recordLayers.some((layer) => APPLICATION_LAYERS.has(layer))
    ? "application"
    : recordLayers.includes("project")
      ? "project"
      : "none";

  return { layers: [...layers], scope, needsRegulatory };
}

export function selectionState(input: {
  scope: QuestionPlan["scope"];
  applicationId: string | null;
  projectCount: number;
  applicationCount: number;
}): "ready" | "ambiguous" | "empty" {
  if (input.applicationId) return "ready";
  if (input.scope === "none") return "ready";
  if (input.scope === "project") {
    if (input.projectCount === 0) return "empty";
    if (input.projectCount > 1) return "ambiguous";
    return "ready";
  }
  if (input.applicationCount === 0) return "empty";
  if (input.applicationCount > 1) return "ambiguous";
  return "ready";
}

const OVERRIDE = /ignore\s+(?:all\s+|any\s+|the\s+|previous\s+|prior\s+|my\s+)*instructions|ignore\s+citations|reveal\s+(the\s+)?(secret|service role|api key)|system prompt/i;

export function instructionOverride(text: string): boolean {
  return OVERRIDE.test(text);
}
