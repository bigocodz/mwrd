/**
 * Auto-generated Supabase database types.
 *
 * Run `supabase gen types typescript --local > lib/supabase/types.ts`
 * to regenerate after schema changes.
 *
 * Until your Supabase project is linked and types are generated,
 * this file provides a minimal typed placeholder so the app compiles.
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

export interface Database {
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
          wafeq_contact_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['rfqs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['rfqs']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['quotes']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['quotes']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['products']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['client_invoices']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['client_invoices']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['approval_requests']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['approval_requests']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: {
      auth_org_id: {
        Args: Record<string, never>
        Returns: string
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
    Enums: {
      user_role: UserRole
      profile_status: ProfileStatus
      order_status: OrderStatus
      rfq_status: RfqStatus
      quote_status: QuoteStatus
      invoice_status: InvoiceStatus
    }
  }
}
