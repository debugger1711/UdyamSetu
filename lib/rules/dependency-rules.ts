/**
 * Graph dependency rules for sequence calculation
 */

export interface ApprovalDependencyEdge {
  fromApprovalCode: string;
  toApprovalCode: string;
  dependencyType: "hard_prerequisite" | "parallel_allowed";
}

export const CORE_APPROVAL_DEPENDENCY_GRAPH: ApprovalDependencyEdge[] = [
  {
    fromApprovalCode: "MIDC_LAND_ALLOTMENT",
    toApprovalCode: "PCB_CTE",
    dependencyType: "hard_prerequisite",
  },
  {
    fromApprovalCode: "MIDC_LAND_ALLOTMENT",
    toApprovalCode: "FACTORY_PLAN_DISH",
    dependencyType: "hard_prerequisite",
  },
  {
    fromApprovalCode: "PCB_CTE",
    toApprovalCode: "FACTORY_PLAN_DISH",
    dependencyType: "parallel_allowed",
  },
  {
    fromApprovalCode: "FIRE_NOC",
    toApprovalCode: "FACTORY_PLAN_DISH",
    dependencyType: "hard_prerequisite",
  },
  {
    fromApprovalCode: "PCB_CTE",
    toApprovalCode: "PCB_CTO",
    dependencyType: "hard_prerequisite",
  },
];
