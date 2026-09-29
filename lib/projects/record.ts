import type { LandClassification } from "../../types/project";

export const PROJECT_COLUMNS =
  "id, user_id, name, entity_name, sector, pollution_category, total_investment_cr, stage, location, land_classification, created_at, updated_at";

export type PollutionCategory = "white" | "green" | "orange" | "red";

export type ProjectWriteInput = {
  name: string;
  sector: string;
  totalInvestmentCr: number;
  location?: string;
  entityName?: string;
  pollutionCategory?: PollutionCategory;
  stage?: string;
  landClassification?: LandClassification;
};

export type ProjectRow = {
  id: string;
  user_id: string;
  name: string;
  entity_name: string | null;
  sector: string;
  pollution_category: string;
  total_investment_cr: number | string;
  stage: string;
  location: string | null;
  land_classification: string | null;
  created_at?: string;
  updated_at?: string;
};

/** The signed-in user is the only owner that can be written. Category and stage must be explicit. */
export function toProjectInsert(
  actorId: string,
  input: ProjectWriteInput & { pollutionCategory: PollutionCategory; stage: string },
) {
  return {
    user_id: actorId,
    name: input.name,
    entity_name: input.entityName ?? null,
    sector: input.sector,
    pollution_category: input.pollutionCategory,
    total_investment_cr: input.totalInvestmentCr,
    stage: input.stage,
    location: input.location ?? null,
    land_classification: input.landClassification ?? null,
  };
}

export function toProjectUpdate(actorId: string, input: Partial<ProjectWriteInput>) {
  return {
    user_id: actorId,
    ...(input.name ? { name: input.name } : {}),
    ...(input.entityName ? { entity_name: input.entityName } : {}),
    ...(input.sector ? { sector: input.sector } : {}),
    ...(input.pollutionCategory ? { pollution_category: input.pollutionCategory } : {}),
    ...(input.totalInvestmentCr ? { total_investment_cr: input.totalInvestmentCr } : {}),
    ...(input.stage ? { stage: input.stage } : {}),
    ...(input.location ? { location: input.location } : {}),
    ...(input.landClassification ? { land_classification: input.landClassification } : {}),
  };
}

/**
 * Missing rows and another user's rows are the same result.
 * The caller should respond with not found.
 */
export function visibleProject<T extends { user_id: string }>(
  project: T | null,
  actorId: string,
): T | null {
  if (!project || project.user_id !== actorId) {
    return null;
  }
  return project;
}

export function visibleProjects<T extends { user_id: string }>(projects: T[], actorId: string): T[] {
  return projects.filter((project) => project.user_id === actorId);
}

export function landClassificationLabel(value: string | null): string {
  if (value === "industrial_estate") return "Industrial estate";
  if (value === "private_agricultural") return "Private agricultural";
  if (value === "private_non_agricultural") return "Private non-agricultural";
  if (value === "sez") return "SEZ";
  return "Not recorded";
}

export function pollutionLabel(category: string): string {
  if (category === "white") return "White Category (CPCB)";
  if (category === "green") return "Green Category (CPCB)";
  if (category === "red") return "Red Category (CPCB)";
  if (category === "orange") return "Orange Category (CPCB)";
  return category;
}

export function stageLabel(stage: string): string {
  if (stage === "pre_establishment") return "Pre-Establishment / Consents";
  if (stage === "expansion") return "Brownfield Capacity Expansion";
  if (stage === "operational") return "Operational Unit Regularization";
  if (stage === "planning") return "Planning";
  return stage;
}

export function toPublicProject(row: ProjectRow) {
  return {
    id: row.id,
    name: row.name,
    entity_name: row.entity_name,
    sector: row.sector,
    pollution_category: row.pollution_category,
    total_investment_cr: row.total_investment_cr,
    stage: row.stage,
    location: row.location,
    land_classification: row.land_classification,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

export function investmentLabel(amount: number | string): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "Investment not recorded";
  return `₹${value.toFixed(2)} Cr Investment`;
}
