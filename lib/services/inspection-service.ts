import { JointInspection } from "@/types/inspection";

export const InspectionService = {
  async getInspectionsByProject(_projectId?: string): Promise<JointInspection[]> {
    void _projectId;
    return [];
  },
};
