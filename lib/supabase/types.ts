/**
 * Supabase database types.
 *
 * Run `supabase gen types typescript --local > lib/supabase/types.ts`
 * to regenerate after schema changes. This placeholder enables the app to
 * compile before migrations are applied to a live project.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'CLIENT' | 'SUPPLIER' | 'ADMIN' | 'AUDITOR'
export type ProfileStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'REQUIRES_ATTENTION' | 'DEACTIVATED' | 'FROZEN'
export type KycStatus = 'INCOMPLETE' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED'
export type TeamRole = 'OWNER' | 'ADMIN' | 'BUYER' | 'APPROVER' | 'VIEWER'
export type RfqStatus = 'OPEN' | 'QUOTED' | 'CLOSED'
export type QuoteStatus = 'AUTO_DRAFT' | 'PENDING_ADMIN' | 'SENT_TO_CLIENT' | 'CLIENT_REVISION_REQUESTED' | 'SUPPLIER_REVISION_REQUESTED' | 'REVISION_SUBMITTED' | 'ACCEPTED' | 'REJECTED'
export type OrderStatus = 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'PREPARING' | 'DISPATCHED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED'
export type InvoiceStatus = 'PENDING_PAYMENT' | 'PAID' | 'OVERDUE' | 'VOID'
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type ProductApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          role: UserRole
          status: ProfileStatus
          kyc_status: KycStatus
          company_name: string | null
          public_id: string | null
          credit_limit: number | null
          current_balance: number | null
          parent_client_id: string | null
          team_role: TeamRole | null
          full_name: string | null
          job_title: string | null
          phone: string | null
          cr_number: string | null
          vat_number: string | null
          legal_name_ar: string | null
          legal_name_en: string | null
          national_address: Json | null
          iban: string | null
          bank_name: string | null
          preferred_language: 'ar' | 'en' | null
          show_hijri: boolean | null
          stamp_storage_path: string | null
          signature_storage_path: string | null
          is_preferred: boolean | null
          must_change_password: boolean
          freeze_reason: string | null
          wafeq_contact_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          role?: UserRole
          status?: ProfileStatus
          kyc_status?: KycStatus
          company_name?: string | null
          public_id?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          parent_client_id?: string | null
          team_role?: TeamRole | null
          full_name?: string | null
          job_title?: string | null
          phone?: string | null
          cr_number?: string | null
          vat_number?: string | null
          legal_name_ar?: string | null
          legal_name_en?: string | null
          national_address?: Json | null
          iban?: string | null
          bank_name?: string | null
          preferred_language?: 'ar' | 'en' | null
          show_hijri?: boolean | null
          stamp_storage_path?: string | null
          signature_storage_path?: string | null
          is_preferred?: boolean | null
          must_change_password?: boolean
          freeze_reason?: string | null
          wafeq_contact_id?: string | null
        }
        Update: {
          user_id?: string
          role?: UserRole
          status?: ProfileStatus
          kyc_status?: KycStatus
          company_name?: string | null
          public_id?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          parent_client_id?: string | null
          team_role?: TeamRole | null
          full_name?: string | null
          job_title?: string | null
          phone?: string | null
          cr_number?: string | null
          vat_number?: string | null
          legal_name_ar?: string | null
          legal_name_en?: string | null
          national_address?: Json | null
          iban?: string | null
          bank_name?: string | null
          preferred_language?: 'ar' | 'en' | null
          show_hijri?: boolean | null
          stamp_storage_path?: string | null
          signature_storage_path?: string | null
          is_preferred?: boolean | null
          must_change_password?: boolean
          freeze_reason?: string | null
          wafeq_contact_id?: string | null
        }
        Relationships: []
      }
      rfqs: {
        Row: {
          id: string
          client_id: string
          status: RfqStatus
          category: string | null
          template_key: string | null
          expiry_date: string | null
          required_by: string | null
          delivery_location: string | null
          notes: string | null
          cost_center_id: string | null
          branch_id: string | null
          department_id: string | null
          created_at: string
        }
        Insert: {
          client_id: string
          status?: RfqStatus
          category?: string | null
          template_key?: string | null
          expiry_date?: string | null
          required_by?: string | null
          delivery_location?: string | null
          notes?: string | null
          cost_center_id?: string | null
          branch_id?: string | null
          department_id?: string | null
        }
        Update: {
          client_id?: string
          status?: RfqStatus
          category?: string | null
          template_key?: string | null
          expiry_date?: string | null
          required_by?: string | null
          delivery_location?: string | null
          notes?: string | null
          cost_center_id?: string | null
          branch_id?: string | null
          department_id?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          rfq_id: string
          quote_id: string
          client_id: string
          supplier_id: string
          client_po_id: string | null
          transaction_ref: string | null
          status: OrderStatus
          total_before_vat: number
          total_with_vat: number
          delivery_location: string | null
          required_by: string | null
          notes: string | null
          confirmed_at: string | null
          dispatched_at: string | null
          delivered_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          cancelled_reason: string | null
          dispute_status: 'OPEN' | 'RESOLVED' | 'REJECTED' | null
          created_at: string
        }
        Insert: {
          rfq_id: string
          quote_id: string
          client_id: string
          supplier_id: string
          client_po_id?: string | null
          transaction_ref?: string | null
          status?: OrderStatus
          total_before_vat: number
          total_with_vat: number
          delivery_location?: string | null
          required_by?: string | null
          notes?: string | null
          confirmed_at?: string | null
          dispatched_at?: string | null
          delivered_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          cancelled_reason?: string | null
          dispute_status?: 'OPEN' | 'RESOLVED' | 'REJECTED' | null
        }
        Update: {
          rfq_id?: string
          quote_id?: string
          client_id?: string
          supplier_id?: string
          client_po_id?: string | null
          transaction_ref?: string | null
          status?: OrderStatus
          total_before_vat?: number
          total_with_vat?: number
          delivery_location?: string | null
          required_by?: string | null
          notes?: string | null
          confirmed_at?: string | null
          dispatched_at?: string | null
          delivered_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          cancelled_reason?: string | null
          dispute_status?: 'OPEN' | 'RESOLVED' | 'REJECTED' | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          id: string
          rfq_id: string
          supplier_id: string
          status: QuoteStatus
          source: 'MANUAL' | 'AUTO_DRAFT' | 'AUTO_SENT' | null
          review_until: string | null
          supplier_notes: string | null
          revision_count: number | null
          created_at: string
        }
        Insert: {
          rfq_id: string
          supplier_id: string
          status?: QuoteStatus
          source?: 'MANUAL' | 'AUTO_DRAFT' | 'AUTO_SENT' | null
          review_until?: string | null
          supplier_notes?: string | null
          revision_count?: number | null
        }
        Update: {
          rfq_id?: string
          supplier_id?: string
          status?: QuoteStatus
          source?: 'MANUAL' | 'AUTO_DRAFT' | 'AUTO_SENT' | null
          review_until?: string | null
          supplier_notes?: string | null
          revision_count?: number | null
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          supplier_id: string
          name: string
          description: string | null
          category: string
          master_product_id: string | null
          cost_price: number
          lead_time_days: number
          approval_status: ProductApprovalStatus
          availability_status: 'AVAILABLE' | 'LIMITED_STOCK' | 'OUT_OF_STOCK'
          images: string[]
          auto_quote: boolean | null
          created_at: string
        }
        Insert: {
          supplier_id: string
          name: string
          description?: string | null
          category: string
          master_product_id?: string | null
          cost_price: number
          lead_time_days: number
          approval_status?: ProductApprovalStatus
          availability_status?: 'AVAILABLE' | 'LIMITED_STOCK' | 'OUT_OF_STOCK'
          images?: string[]
          auto_quote?: boolean | null
        }
        Update: {
          supplier_id?: string
          name?: string
          description?: string | null
          category?: string
          master_product_id?: string | null
          cost_price?: number
          lead_time_days?: number
          approval_status?: ProductApprovalStatus
          availability_status?: 'AVAILABLE' | 'LIMITED_STOCK' | 'OUT_OF_STOCK'
          images?: string[]
          auto_quote?: boolean | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string | null
          read: boolean
          link: string | null
          event_type: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          title: string
          message?: string | null
          read?: boolean
          link?: string | null
          event_type?: string | null
        }
        Update: {
          user_id?: string
          title?: string
          message?: string | null
          read?: boolean
          link?: string | null
          event_type?: string | null
        }
        Relationships: []
      }
      client_invoices: {
        Row: {
          id: string
          client_id: string
          order_id: string | null
          invoice_number: string
          issue_date: string
          due_date: string
          subtotal: number
          vat_amount: number
          total_amount: number
          status: InvoiceStatus
          match_status: string | null
          zatca_status: string | null
          created_at: string
        }
        Insert: {
          client_id: string
          order_id?: string | null
          invoice_number: string
          issue_date: string
          due_date: string
          subtotal: number
          vat_amount: number
          total_amount: number
          status?: InvoiceStatus
          match_status?: string | null
          zatca_status?: string | null
        }
        Update: {
          client_id?: string
          order_id?: string | null
          invoice_number?: string
          issue_date?: string
          due_date?: string
          subtotal?: number
          vat_amount?: number
          total_amount?: number
          status?: InvoiceStatus
          match_status?: string | null
          zatca_status?: string | null
        }
        Relationships: []
      }
      approval_requests: {
        Row: {
          id: string
          quote_id: string
          rfq_id: string
          client_id: string
          rule_id: string
          rule_name: string
          quote_total: number
          status: ApprovalStatus
          requested_at: string
          decided_at: string | null
          current_group: number | null
          total_groups: number | null
          created_at: string
        }
        Insert: {
          quote_id: string
          rfq_id: string
          client_id: string
          rule_id: string
          rule_name: string
          quote_total: number
          status?: ApprovalStatus
          requested_at?: string
          decided_at?: string | null
          current_group?: number | null
          total_groups?: number | null
        }
        Update: {
          quote_id?: string
          rfq_id?: string
          client_id?: string
          rule_id?: string
          rule_name?: string
          quote_total?: number
          status?: ApprovalStatus
          requested_at?: string
          decided_at?: string | null
          current_group?: number | null
          total_groups?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_org_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      user_role: 'CLIENT' | 'SUPPLIER' | 'ADMIN' | 'AUDITOR'
      profile_status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'REQUIRES_ATTENTION' | 'DEACTIVATED' | 'FROZEN'
      order_status: 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'PREPARING' | 'DISPATCHED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED'
      rfq_status: 'OPEN' | 'QUOTED' | 'CLOSED'
      quote_status: 'AUTO_DRAFT' | 'PENDING_ADMIN' | 'SENT_TO_CLIENT' | 'CLIENT_REVISION_REQUESTED' | 'SUPPLIER_REVISION_REQUESTED' | 'REVISION_SUBMITTED' | 'ACCEPTED' | 'REJECTED'
      invoice_status: 'PENDING_PAYMENT' | 'PAID' | 'OVERDUE' | 'VOID'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
