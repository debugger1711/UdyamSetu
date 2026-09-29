export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          sector: string;
          pollution_category: string;
          total_investment_cr: number;
          stage: string;
          entity_name: string | null;
          location: string | null;
          land_classification: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          sector: string;
          pollution_category: string;
          total_investment_cr: number;
          stage?: string;
          entity_name?: string | null;
          location?: string | null;
          land_classification?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          sector?: string;
          pollution_category?: string;
          total_investment_cr?: number;
          stage?: string;
          entity_name?: string | null;
          location?: string | null;
          land_classification?: string | null;
          updated_at?: string;
        };
      };
      applications: {
        Row: {
          id: string;
          project_id: string;
          title: string | null;
          approval_id: string | null;
          status: string;
          submitted_at: string | null;
          sla_deadline: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title?: string | null;
          approval_id?: string | null;
          status?: string;
          submitted_at?: string | null;
          sla_deadline?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string | null;
          status?: string;
          submitted_at?: string | null;
          sla_deadline?: string | null;
          updated_at?: string;
        };
      };
      approval_types: {
        Row: {
          id: string;
          code: string;
          name: string;
          department: string | null;
          description: string | null;
          category: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          department?: string | null;
          description?: string | null;
          category: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          department?: string | null;
          description?: string | null;
          category?: string;
          updated_at?: string;
        };
      };
      application_approvals: {
        Row: {
          id: string;
          application_id: string;
          approval_type_id: string;
          status: string;
          sort_order: number;
          required: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          approval_type_id: string;
          status?: string;
          sort_order: number;
          required?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          status?: string;
          sort_order?: number;
          required?: boolean;
          updated_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          application_id: string;
          application_approval_id: string | null;
          name: string;
          file_name: string;
          storage_path: string;
          mime_type: string;
          file_size: number;
          status: string;
          category: string;
          authority: string | null;
          analysis: Json | null;
          uploaded_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          application_id: string;
          application_approval_id?: string | null;
          name: string;
          file_name: string;
          storage_path: string;
          mime_type: string;
          file_size: number;
          status?: string;
          category: string;
          authority?: string | null;
          analysis?: Json | null;
          uploaded_at?: string;
          updated_at?: string;
        };
        Update: {
          analysis?: Json | null;
          updated_at?: string;
        };
      };
      departments: {
        Row: {
          id: string;
          code: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          created_at?: string;
        };
        Update: {
          name?: string;
        };
      };
      officer_departments: {
        Row: {
          user_id: string;
          department_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          department_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
      application_department_workflows: {
        Row: {
          id: string;
          application_id: string;
          application_approval_id: string;
          department_id: string;
          status: string;
          submitted_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          application_approval_id: string;
          department_id: string;
          status?: string;
          submitted_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          updated_at?: string;
        };
      };
      application_queries: {
        Row: {
          id: string;
          application_id: string;
          department_workflow_id: string;
          body: string;
          status: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          department_workflow_id: string;
          body: string;
          status?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: string;
          updated_at?: string;
        };
      };
      application_query_responses: {
        Row: {
          id: string;
          query_id: string;
          body: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          query_id: string;
          body: string;
          created_by: string;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
    };
    Functions: {
      health_check: {
        Args: Record<string, never>;
        Returns: number;
      };
      generate_application_approvals: {
        Args: { target_application: string };
        Returns: Json;
      };
      register_uploaded_document: {
        Args: {
          target_application: string;
          target_document: string;
          target_approval: string | null;
          document_name: string;
          safe_file_name: string;
          document_mime: string;
          document_size: number;
          document_category: string;
          document_authority: string;
        };
        Returns: string;
      };
      record_document_analysis: {
        Args: { target_document: string; payload: Json };
        Returns: undefined;
      };
      submit_application: {
        Args: { target_application: string };
        Returns: Json;
      };
      raise_department_query: {
        Args: { target_workflow: string; question: string };
        Returns: string;
      };
      respond_to_query: {
        Args: { target_query: string; answer: string };
        Returns: string;
      };
    };
  };
}
