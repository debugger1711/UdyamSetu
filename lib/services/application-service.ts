import { Application } from "@/types/application";

export const ApplicationService = {
  async getApplicationsByProject(_projectId?: string): Promise<Application[]> {
    void _projectId;
    return [];
  },
  async getApplicationById(_id?: string): Promise<Application | null> {
    void _id;
    return null;
  },
};
