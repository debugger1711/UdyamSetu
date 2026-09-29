import { UploadedDocument } from "@/types/document";

export const DocumentService = {
  async getDocumentsByApplication(_applicationId?: string): Promise<UploadedDocument[]> {
    void _applicationId;
    return [];
  },
};
