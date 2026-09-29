import { IndustrialProject } from "@/types/project";
import { GovernmentScheme } from "@/types/scheme";

/**
 * Checks eligibility of a project against central and state government schemes.
 */
export function checkSchemeEligibility(
  project: IndustrialProject,
  schemes: GovernmentScheme[]
): GovernmentScheme[] {
  return schemes.filter((scheme) => {
    if (!scheme.isActive) return false;
    if (scheme.state && scheme.state !== project.state) return false;
    return true;
  });
}
