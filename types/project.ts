export const POLLUTION_CATEGORIES = ["white", "green", "orange", "red"] as const;

export type PollutionCategory = (typeof POLLUTION_CATEGORIES)[number];

export type ProjectStage =
  | "planning"
  | "pre_establishment"
  | "construction"
  | "pre_operation"
  | "operational";

export const LAND_CLASSIFICATIONS = [
  "industrial_estate",
  "private_agricultural",
  "private_non_agricultural",
  "sez",
] as const;

export type LandClassification = (typeof LAND_CLASSIFICATIONS)[number];

export interface IndustrialProject {
  id: string;
  userId: string;
  name: string;
  entityName: string;
  sector: string;
  subSector?: string;
  pollutionCategory: PollutionCategory;
  pollutionScore?: number;
  totalInvestmentCr: number;
  plantMachineryCr: number;
  enterpriseSize: "micro" | "small" | "medium" | "large";
  landClassification: LandClassification;
  landAreaAcres: number;
  builtUpAreaSqMtr?: number;
  state: string;
  district: string;
  taluka?: string;
  industrialAreaName?: string;
  plotNumber?: string;
  connectedPowerKva?: number;
  waterRequirementKld?: number;
  stage: ProjectStage;
  createdAt: string;
  updatedAt: string;
}
