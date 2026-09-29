/**
 * Validation schemas and helper contracts for project and application onboarding.
 * Note: Zod schema validators will be integrated when Zod package is added.
 */

export interface ProjectFormData {
  name: string;
  sector: string;
  totalInvestmentCr: number;
  plantMachineryCr: number;
  state: string;
  district: string;
  landClassification: string;
  landAreaAcres: number;
}

export function validateProjectFormData(data: Partial<ProjectFormData>): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!data.name || data.name.trim().length < 3) {
    errors.name = "Project name must be at least 3 characters.";
  }
  if (!data.sector) {
    errors.sector = "Industrial sector is required.";
  }
  if (data.totalInvestmentCr === undefined || data.totalInvestmentCr <= 0) {
    errors.totalInvestmentCr = "Valid investment amount required.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
