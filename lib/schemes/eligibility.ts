/**
 * Scheme eligibility uses only rules stored on a scheme and fields stored on a project.
 * Pollution category, land classification, sector, and stage are the stored fields.
 * Investment, employment, geography, subsidy, and deadlines are not evaluated.
 * A missing stored value is insufficient data, not ineligibility.
 */

export type EligibilityOutcome = "eligible" | "not_eligible" | "insufficient_data";

export type ProjectFacts = {
  pollutionCategory: string | null;
  landClassification: string | null;
  sector: string | null;
  stage: string | null;
};

const KNOWN_RULES = ["pollutionCategory", "landClassification", "sector", "stage"] as const;

type KnownRule = (typeof KNOWN_RULES)[number];

const LABELS: Record<KnownRule, string> = {
  pollutionCategory: "Pollution category",
  landClassification: "Land classification",
  sector: "Sector",
  stage: "Stage",
};

function present(value: string | null | undefined): string | null {
  if (!value || !value.trim()) return null;
  return value.trim();
}

function allowedValues(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (!value.every((item) => typeof item === "string" && item.trim())) return null;
  return value.map((item) => item.trim());
}

export function evaluateSchemeEligibility(
  active: boolean,
  rules: unknown,
  project: ProjectFacts,
): { outcome: EligibilityOutcome; reasons: string[] } {
  if (!active) {
    return { outcome: "not_eligible", reasons: ["The scheme is not active."] };
  }
  if (rules == null || typeof rules !== "object" || Array.isArray(rules)) {
    return { outcome: "insufficient_data", reasons: ["No eligibility rule is configured."] };
  }

  const record = rules as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length === 0) {
    return { outcome: "insufficient_data", reasons: ["No eligibility rule is configured."] };
  }
  if (keys.some((key) => !KNOWN_RULES.includes(key as KnownRule))) {
    return {
      outcome: "insufficient_data",
      reasons: ["The eligibility rule uses a value this project record does not evaluate."],
    };
  }

  const facts: Record<KnownRule, string | null> = {
    pollutionCategory: present(project.pollutionCategory),
    landClassification: present(project.landClassification),
    sector: present(project.sector),
    stage: present(project.stage),
  };
  const missing: string[] = [];
  const mismatches: string[] = [];

  for (const key of KNOWN_RULES) {
    if (!(key in record)) continue;
    const allowed = allowedValues(record[key]);
    if (!allowed) {
      missing.push(`${LABELS[key]} rule is not configured.`);
      continue;
    }
    const actual = facts[key];
    if (!actual) {
      missing.push(`${LABELS[key]} is not recorded.`);
      continue;
    }
    if (!allowed.includes(actual)) {
      mismatches.push(`${LABELS[key]} does not match the configured rule.`);
    }
  }

  if (missing.length > 0) return { outcome: "insufficient_data", reasons: missing };
  if (mismatches.length > 0) return { outcome: "not_eligible", reasons: mismatches };
  return { outcome: "eligible", reasons: ["The recorded project fields match the configured rule."] };
}
