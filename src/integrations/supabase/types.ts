export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      invoice_import_log: {
        Row: {
          action: string
          id: string
          imported_at: string
          imported_by: string | null
          imported_data: Json
          invoice_id: string | null
          invoice_number: string
          source_pdf_name: string | null
          source_pdf_url: string | null
        }
        Insert: {
          action?: string
          id?: string
          imported_at?: string
          imported_by?: string | null
          imported_data?: Json
          invoice_id?: string | null
          invoice_number: string
          source_pdf_name?: string | null
          source_pdf_url?: string | null
        }
        Update: {
          action?: string
          id?: string
          imported_at?: string
          imported_by?: string | null
          imported_data?: Json
          invoice_id?: string | null
          invoice_number?: string
          source_pdf_name?: string | null
          source_pdf_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_import_log_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_address_line1: string | null
          client_address_line2: string | null
          client_city_zip: string | null
          client_country: string | null
          client_is_canary: boolean
          client_is_foreign: boolean
          client_name: string
          client_tax_id: string | null
          created_at: string
          id: string
          invoice_date: string
          invoice_number: string
          invoice_type: string
          irpf_amount: number
          irpf_rate: number
          is_rectificative: boolean
          is_university: boolean
          issuer_id: string
          line_items: Json
          notes: string | null
          our_reference: string | null
          paid: boolean
          paid_at: string | null
          parent_invoice_number: string | null
          payment_proof_url: string | null
          post_payment_note: string | null
          pre_payment_note: string | null
          rectified_invoice_number: string | null
          seq: number
          source_pdf_name: string | null
          source_pdf_url: string | null
          status: string
          subtotal: number
          their_order: string | null
          total: number
          university_accounting_office: string | null
          university_managing_body: string | null
          university_processing_unit: string | null
          updated_at: string
          vat_amount: number
          vat_label: string
          vat_rate: number
          year: number
        }
        Insert: {
          client_address_line1?: string | null
          client_address_line2?: string | null
          client_city_zip?: string | null
          client_country?: string | null
          client_is_canary?: boolean
          client_is_foreign?: boolean
          client_name: string
          client_tax_id?: string | null
          created_at?: string
          id?: string
          invoice_date: string
          invoice_number: string
          invoice_type: string
          irpf_amount?: number
          irpf_rate?: number
          is_rectificative?: boolean
          is_university?: boolean
          issuer_id: string
          line_items?: Json
          notes?: string | null
          our_reference?: string | null
          paid?: boolean
          paid_at?: string | null
          parent_invoice_number?: string | null
          payment_proof_url?: string | null
          post_payment_note?: string | null
          pre_payment_note?: string | null
          rectified_invoice_number?: string | null
          seq: number
          source_pdf_name?: string | null
          source_pdf_url?: string | null
          status?: string
          subtotal?: number
          their_order?: string | null
          total?: number
          university_accounting_office?: string | null
          university_managing_body?: string | null
          university_processing_unit?: string | null
          updated_at?: string
          vat_amount?: number
          vat_label?: string
          vat_rate?: number
          year: number
        }
        Update: {
          client_address_line1?: string | null
          client_address_line2?: string | null
          client_city_zip?: string | null
          client_country?: string | null
          client_is_canary?: boolean
          client_is_foreign?: boolean
          client_name?: string
          client_tax_id?: string | null
          created_at?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          invoice_type?: string
          irpf_amount?: number
          irpf_rate?: number
          is_rectificative?: boolean
          is_university?: boolean
          issuer_id?: string
          line_items?: Json
          notes?: string | null
          our_reference?: string | null
          paid?: boolean
          paid_at?: string | null
          parent_invoice_number?: string | null
          payment_proof_url?: string | null
          post_payment_note?: string | null
          pre_payment_note?: string | null
          rectified_invoice_number?: string | null
          seq?: number
          source_pdf_name?: string | null
          source_pdf_url?: string | null
          status?: string
          subtotal?: number
          their_order?: string | null
          total?: number
          university_accounting_office?: string | null
          university_managing_body?: string | null
          university_processing_unit?: string | null
          updated_at?: string
          vat_amount?: number
          vat_label?: string
          vat_rate?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_issuer_id_fkey"
            columns: ["issuer_id"]
            isOneToOne: false
            referencedRelation: "issuers"
            referencedColumns: ["id"]
          },
        ]
      }
      issuers: {
        Row: {
          address_line1: string
          address_line2: string | null
          ccc: string | null
          city_zip: string
          created_at: string
          email: string | null
          iban: string | null
          id: string
          name: string
          phone: string | null
          swift: string | null
          tax_id: string
          updated_at: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          ccc?: string | null
          city_zip: string
          created_at?: string
          email?: string | null
          iban?: string | null
          id: string
          name: string
          phone?: string | null
          swift?: string | null
          tax_id: string
          updated_at?: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          ccc?: string | null
          city_zip?: string
          created_at?: string
          email?: string | null
          iban?: string | null
          id?: string
          name?: string
          phone?: string | null
          swift?: string | null
          tax_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_invoice_gaps: {
        Args: { _issuer_id: string; _year: number }
        Returns: {
          missing_seq: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_invoice_seq: {
        Args: { _issuer_id: string; _year: number }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
