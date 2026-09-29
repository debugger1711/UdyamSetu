import "server-only";

import { createHash } from "node:crypto";

import { requireAnyRole, requireUser } from "@/lib/auth/session";
import { type Citation, type RegulatoryAnswer } from "@/lib/knowledge/answer";
import { composeAwareAnswer, type FactBundle, type ProjectFact } from "@/lib/knowledge/compose";
import { planQuestion, selectionState } from "@/lib/knowledge/context-plan";
import { evaluateSchemeEligibility } from "@/lib/schemes/eligibility";
import { chunkText } from "@/lib/knowledge/chunk";
import { embeddingLiteral } from "@/lib/knowledge/embedding";
import { lexicalQuery } from "@/lib/knowledge/lexical";
import { embedText, summarizeExcerpts } from "@/lib/knowledge/model";
import { createClient } from "@/lib/supabase/server";

type ChunkHit = {
  chunk_id: string;
  document_id: string;
  title: string;
  source_label: string;
  source_uri: string | null;
  excerpt: string;
};

function toCitation(row: ChunkHit): Citation {
  return {
    chunkId: row.chunk_id,
    documentId: row.document_id,
    title: row.title,
    sourceLabel: row.source_label,
    sourceUri: row.source_uri,
    excerpt: row.excerpt,
  };
}

function knowledgeStatus(message: string): 400 | 403 | 409 | 503 {
  if (message.includes("invalid knowledge")) return 400;
  if (message.includes("knowledge document already stored")) return 409;
  if (message.includes("knowledge was not stored")) return 403;
  return 503;
}

export async function ingestKnowledgeDocument(input: {
  title: string;
  sourceLabel: string;
  sourceUri: string | null;
  text: string;
  metadata?: Record<string, unknown>;
}): Promise<{ status: 201; documentId: string } | { status: 400 | 403 | 409 | 503 }> {
  await requireAnyRole(["officer", "admin"]);
  let chunks: string[];
  try {
    chunks = chunkText(input.text);
  } catch {
    return { status: 400 };
  }
  if (chunks.length === 0) return { status: 400 };

  const rows = [];
  for (const content of chunks) {
    const embedded = await embedText(content);
    rows.push({
      content,
      embedding: embedded ? embeddingLiteral(embedded) : null,
    });
  }

  const supabase = await createClient();
  const result = await supabase.rpc("ingest_knowledge_document", {
    document_title: input.title,
    document_source: input.sourceLabel,
    document_uri: input.sourceUri,
    document_hash: createHash("sha256").update(input.text.replace(/\s+/g, " ").trim()).digest("hex"),
    chunk_rows: rows,
    document_metadata: input.metadata ?? {},
  });
  if (result.error) return { status: knowledgeStatus(result.error.message ?? "") };
  return { status: 201, documentId: String(result.data) };
}

export async function searchKnowledge(query: string): Promise<{ ok: true; citations: Citation[] } | { ok: false }> {
  await requireUser();
  const supabase = await createClient();
  const embedded = await embedText(query);
  const hits = new Map<string, Citation>();

  if (embedded) {
    const literal = embeddingLiteral(embedded);
    if (literal) {
      const vector = await supabase.rpc("search_knowledge_chunks", {
        query_embedding: literal,
        match_count: 5,
      });
      if (vector.error) return { ok: false };
      for (const row of (vector.data ?? []) as ChunkHit[]) hits.set(row.chunk_id, toCitation(row));
    }
  }

  if (hits.size === 0) {
    const lexical = await supabase.rpc("search_knowledge_text", {
      query_text: lexicalQuery(query),
      match_count: 5,
    });
    if (lexical.error) return { ok: false };
    for (const row of (lexical.data ?? []) as ChunkHit[]) hits.set(row.chunk_id, toCitation(row));
  }

  return { ok: true, citations: [...hits.values()].slice(0, 5) };
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

const emptyFacts = (): FactBundle => ({
  project: null,
  application: null,
  approvals: [],
  documents: [],
  workflows: [],
  queries: [],
  inspections: [],
  certificates: [],
  renewals: [],
  schemes: [],
  grievances: [],
  citations: [],
});

export async function askGroundedQuestion(input: {
  query: string;
  applicationId: string | null;
}): Promise<
  { status: 200; answer: RegulatoryAnswer; limitations: string[]; context: { project: string | null; application: string | null } }
  | { status: 404 | 503 }
> {
  await requireUser();
  const plan = planQuestion(input.query);
  const supabase = await createClient();
  const facts = emptyFacts();

  if (plan.scope !== "none") {
    const projects = await supabase
      .from("projects")
      .select("id, name, entity_name, location, sector, pollution_category, total_investment_cr, stage, land_classification")
      .order("created_at", { ascending: false })
      .limit(20);
    if (projects.error) return { status: 503 };
    let applicationQuery = supabase
      .from("applications")
      .select("id, project_id, title, status, submitted_at, sla_deadline")
      .order("created_at", { ascending: false })
      .limit(20);
    if (input.applicationId) applicationQuery = applicationQuery.eq("id", input.applicationId);
    const applications = await applicationQuery;
    if (applications.error) return { status: 503 };

    const projectRows = (projects.data ?? []) as Array<{
      id: string;
      name: string;
      entity_name: string | null;
      location: string | null;
      sector: string;
      pollution_category: string;
      total_investment_cr: number | string;
      stage: string;
      land_classification: string | null;
    }>;
    const applicationRows = (applications.data ?? []) as Array<{
      id: string;
      project_id: string;
      title: string | null;
      status: string;
      submitted_at: string | null;
      sla_deadline: string | null;
    }>;
    if (input.applicationId && applicationRows.length === 0) return { status: 404 };

    const state = selectionState({
      scope: plan.scope,
      applicationId: input.applicationId,
      projectCount: input.applicationId
        ? projectRows.filter((project) => project.id === applicationRows[0]?.project_id).length
        : projectRows.length,
      applicationCount: applicationRows.length,
    });
    if (state === "ambiguous") {
      const composed = composeAwareAnswer({ plan, facts, modelSummary: null, ambiguous: true });
      return { status: 200, answer: composed.answer, limitations: composed.limitations, context: { project: null, application: null } };
    }

    const application = state === "empty" && !input.applicationId ? null : applicationRows[0] ?? null;
    const project = application
      ? projectRows.find((row) => row.id === application.project_id) ?? null
      : projectRows.length === 1 ? projectRows[0] : null;
    if (project) {
      const mapped: ProjectFact = {
        name: project.name,
        entityName: project.entity_name,
        location: project.location,
        sector: project.sector,
        pollutionCategory: project.pollution_category,
        investmentCr: String(project.total_investment_cr),
        stage: project.stage,
        landClassification: project.land_classification,
      };
      facts.project = mapped;
    }
    if (application && plan.scope === "application") {
      facts.application = {
        title: application.title,
        status: application.status,
        submittedAt: application.submitted_at,
        slaDeadline: application.sla_deadline,
      };
    }

    const applicationIds = application && plan.scope === "application" ? [application.id] : [];
    const layers = new Set(plan.layers);
    if (applicationIds.length > 0) {
      const [approvals, documents, workflows, queries, inspections, certificates, renewals] = await Promise.all([
        layers.has("approval")
          ? supabase.from("application_approvals").select("status, required, approval_types ( code, name, department )").in("application_id", applicationIds).limit(40)
          : Promise.resolve({ data: [], error: null }),
        layers.has("document")
          ? supabase.from("documents").select("name, file_name, category, status, uploaded_at").in("application_id", applicationIds).limit(40)
          : Promise.resolve({ data: [], error: null }),
        layers.has("workflow") || layers.has("sla")
          ? supabase.from("application_department_workflows").select("status, sla_started_at, sla_deadline, sla_completed_at, departments ( name )").in("application_id", applicationIds).limit(40)
          : Promise.resolve({ data: [], error: null }),
        layers.has("query")
          ? supabase.from("application_queries").select("status, body, application_query_responses ( body )").in("application_id", applicationIds).limit(20)
          : Promise.resolve({ data: [], error: null }),
        layers.has("inspection")
          ? supabase.from("inspections").select("status, scheduled_at, location, completed_at, inspection_reports ( id )").in("application_id", applicationIds).limit(20)
          : Promise.resolve({ data: [], error: null }),
        layers.has("certificate")
          ? supabase.from("certificates").select("status, certificate_number, issued_at, valid_until").in("application_id", applicationIds).limit(20)
          : Promise.resolve({ data: [], error: null }),
        layers.has("renewal")
          ? supabase.from("renewals").select("status, renewal_due_at").in("application_id", applicationIds).limit(20)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (approvals.error || documents.error || workflows.error || queries.error || inspections.error || certificates.error || renewals.error) {
        return { status: 503 };
      }
      facts.approvals = ((approvals.data ?? []) as Array<{ status: string; required: boolean; approval_types: { code: string; name: string; department: string | null } | { code: string; name: string; department: string | null }[] | null }>).map((row) => {
        const type = one(row.approval_types);
        return { name: type?.name ?? "Not recorded", code: type?.code ?? "Not recorded", status: row.status, department: type?.department ?? null, required: row.required };
      });
      facts.documents = ((documents.data ?? []) as Array<{ name: string; file_name: string; category: string; status: string; uploaded_at: string }>).map((row) => ({
        name: row.name, fileName: row.file_name, category: row.category, status: row.status, uploadedAt: row.uploaded_at,
      }));
      facts.workflows = ((workflows.data ?? []) as Array<{ status: string; sla_started_at: string | null; sla_deadline: string | null; sla_completed_at: string | null; departments: { name: string } | { name: string }[] | null }>).map((row) => ({
        department: one(row.departments)?.name ?? "Not recorded",
        status: row.status,
        slaStartedAt: row.sla_started_at,
        slaDeadline: row.sla_deadline,
        slaCompletedAt: row.sla_completed_at,
      }));
      facts.queries = ((queries.data ?? []) as Array<{ status: string; body: string; application_query_responses: { body: string } | { body: string }[] | null }>).map((row) => ({
        status: row.status,
        body: row.body.slice(0, 240),
        response: one(row.application_query_responses)?.body.slice(0, 240) ?? null,
      }));
      facts.inspections = ((inspections.data ?? []) as Array<{ status: string; scheduled_at: string; location: string | null; completed_at: string | null; inspection_reports: { id: string } | { id: string }[] | null }>).map((row) => ({
        status: row.status,
        scheduledAt: row.scheduled_at,
        location: row.location,
        completedAt: row.completed_at,
        reportRecorded: Boolean(one(row.inspection_reports)),
      }));
      facts.certificates = ((certificates.data ?? []) as Array<{ status: string; certificate_number: string; issued_at: string | null; valid_until: string | null }>).map((row) => ({
        status: row.status, number: row.certificate_number, issuedAt: row.issued_at, validUntil: row.valid_until,
      }));
      facts.renewals = ((renewals.data ?? []) as Array<{ status: string; renewal_due_at: string | null }>).map((row) => ({
        status: row.status, dueAt: row.renewal_due_at,
      }));
    }

    if (layers.has("grievance")) {
      const grievances = await supabase.from("grievances").select("subject, status, grievance_escalations ( id )").limit(20);
      if (grievances.error) return { status: 503 };
      facts.grievances = ((grievances.data ?? []) as Array<{ subject: string; status: string; grievance_escalations: { id: string } | { id: string }[] | null }>).map((row) => ({
        subject: row.subject,
        status: row.status,
        escalationRecorded: Boolean(one(row.grievance_escalations)),
      }));
    }

    if (layers.has("scheme") && project) {
      const claims = await supabase.from("scheme_applications").select("status, schemes ( name, eligibility_rules )").eq("project_id", project.id).limit(10);
      const catalog = await supabase.from("schemes").select("name, eligibility_rules").limit(10);
      if (claims.error || catalog.error) return { status: 503 };
      const claimRows = (claims.data ?? []) as Array<{ status: string; schemes: { name: string; eligibility_rules: unknown } | { name: string; eligibility_rules: unknown }[] | null }>;
      if (claimRows.length === 0 && (catalog.data ?? []).length === 0) {
        facts.schemes = [];
      } else {
        const source = claimRows.length > 0
          ? claimRows.map((row) => ({ claimStatus: row.status, scheme: one(row.schemes) }))
          : ((catalog.data ?? []) as Array<{ name: string; eligibility_rules: unknown }>).map((row) => ({ claimStatus: null, scheme: row }));
        facts.schemes = source.map((row) => {
          const outcome = evaluateSchemeEligibility(true, row.scheme?.eligibility_rules ?? null, {
            pollutionCategory: project.pollution_category,
            landClassification: project.land_classification,
            sector: project.sector,
            stage: project.stage,
          }).outcome;
          return { name: row.scheme?.name ?? "Not recorded", claimStatus: row.claimStatus, eligibility: outcome };
        });
      }
    }
  }

  if (plan.needsRegulatory) {
    const found = await searchKnowledge(input.query);
    if (!found.ok) return { status: 503 };
    facts.citations = found.citations;
  }
  const modelSummary = facts.citations.length === 0
    ? null
    : await summarizeExcerpts(input.query, facts.citations.map((citation) => citation.excerpt));
  const composed = composeAwareAnswer({ plan, facts, modelSummary });
  return {
    status: 200,
    answer: composed.answer,
    limitations: composed.limitations,
    context: {
      project: facts.project ? (facts.project.entityName || facts.project.name) : null,
      application: facts.application?.title ?? facts.application?.status ?? null,
    },
  };
}
