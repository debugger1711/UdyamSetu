import { Approval } from "@/types/approval";

export const ApprovalService = {
  async getAllApprovals(): Promise<Approval[]> {
    return [];
  },
  async getApprovalById(_id?: string): Promise<Approval | null> {
    void _id;
    return null;
  },
};
