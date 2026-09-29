import { z } from "zod";

import { LAND_CLASSIFICATIONS, POLLUTION_CATEGORIES } from "../../types/project";

/** Stages the project form and earlier records already use. An omitted stage is not stored. */
const PROJECT_STAGES = [
  "planning",
  "pre_establishment",
  "construction",
  "pre_operation",
  "operational",
  "expansion",
] as const;

export const loginSchema = z
  .object({
    email: z.email(),
    password: z.string().min(1),
  })
  .strict();

export const signupSchema = z
  .object({
    email: z.email(),
    password: z.string().min(8),
    fullName: z.string().trim().min(1),
  })
  .strict();

/** Administrator activation. The caller cannot name an account type here. */
export const officerActivationSchema = z
  .object({
    email: z.email(),
    departmentCode: z.string().trim().min(1).max(40),
  })
  .strict();

export const createOwnedProjectSchema = z
  .object({
    name: z.string().trim().min(1),
    entityName: z.string().trim().min(1).optional(),
    sector: z.string().trim().min(1),
    pollutionCategory: z.enum(POLLUTION_CATEGORIES),
    totalInvestmentCr: z.number().positive(),
    stage: z.enum(PROJECT_STAGES),
    location: z.string().trim().min(1),
    landClassification: z.enum(LAND_CLASSIFICATIONS).optional(),
  })
  .strict();

export const createOwnedApplicationSchema = z
  .object({
    title: z.string().trim().min(1),
  })
  .strict();
