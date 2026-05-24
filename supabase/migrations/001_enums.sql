-- ============================================================
-- 001_enums.sql
-- All ENUM types translated from Convex v.union(v.literal(...))
-- ============================================================

-- User / profile enums
CREATE TYPE user_role AS ENUM ('CLIENT', 'SUPPLIER', 'ADMIN', 'AUDITOR');
CREATE TYPE profile_status AS ENUM (
  'PENDING', 'ACTIVE', 'REJECTED', 'REQUIRES_ATTENTION', 'DEACTIVATED', 'FROZEN'
);
CREATE TYPE kyc_status AS ENUM ('INCOMPLETE', 'IN_REVIEW', 'VERIFIED', 'REJECTED');
CREATE TYPE team_role AS ENUM ('OWNER', 'ADMIN', 'BUYER', 'APPROVER', 'VIEWER');
CREATE TYPE wathq_status AS ENUM ('UNVERIFIED', 'VERIFIED', 'MISMATCH', 'EXPIRED');
CREATE TYPE spl_status AS ENUM ('UNVERIFIED', 'VERIFIED', 'MISMATCH', 'NOT_FOUND');
CREATE TYPE payment_terms AS ENUM ('net_30', 'prepaid');
CREATE TYPE preferred_language AS ENUM ('ar', 'en');

-- Product / catalog enums
CREATE TYPE product_status AS ENUM ('DRAFT', 'ACTIVE', 'DEPRECATED');
CREATE TYPE product_approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE availability_status AS ENUM ('AVAILABLE', 'LIMITED_STOCK', 'OUT_OF_STOCK');
CREATE TYPE auto_quote_review_window AS ENUM ('INSTANT', 'MIN_30', 'HR_2');
CREATE TYPE category_status AS ENUM ('ACTIVE', 'PROPOSED', 'REJECTED', 'ARCHIVED');
CREATE TYPE bundle_status AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE tax_class AS ENUM ('STANDARD', 'ZERO_RATED', 'EXEMPT');

-- RFQ / procurement enums
CREATE TYPE rfq_status AS ENUM ('OPEN', 'QUOTED', 'CLOSED');
CREATE TYPE item_flexibility AS ENUM (
  'EXACT_MATCH', 'OPEN_TO_EQUIVALENT', 'OPEN_TO_ALTERNATIVES'
);
CREATE TYPE quote_status AS ENUM (
  'AUTO_DRAFT', 'PENDING_ADMIN', 'SENT_TO_CLIENT',
  'CLIENT_REVISION_REQUESTED', 'SUPPLIER_REVISION_REQUESTED',
  'REVISION_SUBMITTED', 'ACCEPTED', 'REJECTED'
);
CREATE TYPE quote_source AS ENUM ('MANUAL', 'AUTO_DRAFT', 'AUTO_SENT');
CREATE TYPE quote_revision_event_type AS ENUM (
  'CLIENT_REQUESTED', 'ADMIN_REQUESTED', 'SUPPLIER_SUBMITTED', 'ADMIN_SENT_TO_CLIENT'
);
CREATE TYPE procurement_document_type AS ENUM (
  'SPECIFICATION', 'PURCHASE_POLICY', 'SUPPORTING_DOCUMENT',
  'SUPPLIER_QUOTATION', 'COMMERCIAL_TERMS', 'OTHER'
);

-- Order enums
CREATE TYPE order_status AS ENUM (
  'PENDING_CONFIRMATION', 'CONFIRMED', 'PREPARING', 'DISPATCHED',
  'DELIVERED', 'COMPLETED', 'CANCELLED'
);
CREATE TYPE cpo_award_mode AS ENUM ('FULL_BASKET', 'PER_ITEM');
CREATE TYPE cpo_status AS ENUM ('OPEN', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED');
CREATE TYPE dispute_status AS ENUM ('OPEN', 'RESOLVED', 'REJECTED');
CREATE TYPE order_event_type AS ENUM (
  'CREATED', 'CONFIRMED', 'PREPARING', 'DISPATCHED', 'DELIVERED',
  'COMPLETED', 'CANCELLED', 'NOTE', 'TRACKING_UPDATED', 'POD_UPLOADED',
  'DISPUTE_OPENED', 'DISPUTE_RESOLVED', 'DISPUTE_REJECTED'
);

-- Delivery / GRN enums
CREATE TYPE delivery_note_status AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED');
CREATE TYPE grn_status AS ENUM ('DRAFT', 'CONFIRMED', 'DISPUTED', 'CLOSED');
CREATE TYPE grn_line_condition AS ENUM ('GOOD', 'DAMAGED', 'SHORT_SHIPPED', 'WRONG_ITEM');

-- Invoice / payment enums
CREATE TYPE invoice_status AS ENUM ('PENDING_PAYMENT', 'PAID', 'OVERDUE', 'VOID');
CREATE TYPE invoice_match_status AS ENUM (
  'MATCHED', 'MISMATCH', 'NO_GRN', 'DISPUTED_GRN', 'NOT_APPLICABLE'
);
CREATE TYPE invoice_adjustment_type AS ENUM ('CREDIT', 'DEBIT');
CREATE TYPE invoice_adjustment_status AS ENUM (
  'PENDING_CLEARANCE', 'CLEARED', 'FAILED', 'VOID'
);
CREATE TYPE supplier_invoice_status AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'PAID');
CREATE TYPE payment_method AS ENUM (
  'BANK_TRANSFER', 'MADA', 'VISA_MASTERCARD', 'APPLE_PAY', 'STC_PAY'
);
CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'DISCREPANCY');
CREATE TYPE payout_method AS ENUM ('BANK_TRANSFER', 'CHECK');
CREATE TYPE payout_status AS ENUM ('PENDING', 'PAID');
CREATE TYPE wafeq_environment AS ENUM ('simulation', 'production', 'mock');

-- Approval enums
CREATE TYPE approval_request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE approval_step_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED');
CREATE TYPE rfq_schedule_cadence AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY');

-- Notification enums
CREATE TYPE notification_channel AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'WEBHOOK');
CREATE TYPE notification_dispatch_status AS ENUM ('SUCCESS', 'FAILED', 'SKIPPED', 'MOCK');
CREATE TYPE comment_visibility AS ENUM ('INTERNAL', 'CLIENT_THREAD', 'SUPPLIER_THREAD');
CREATE TYPE comment_target_type AS ENUM ('rfq', 'quote', 'order', 'client_invoice', 'dispute');
CREATE TYPE actor_role AS ENUM ('CLIENT', 'SUPPLIER', 'ADMIN', 'AUDITOR', 'SYSTEM');

-- KYC / document enums
CREATE TYPE kyc_document_type AS ENUM (
  'CR_CERTIFICATE', 'VAT_CERTIFICATE', 'NATIONAL_ADDRESS',
  'BANK_LETTER', 'AUTHORIZED_SIGNATORY', 'ID_DOCUMENT', 'OTHER'
);
CREATE TYPE kyc_document_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Contract enums
CREATE TYPE contract_status AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED');
CREATE TYPE margin_type AS ENUM ('GLOBAL', 'CATEGORY', 'CLIENT');

-- Document engine enums
CREATE TYPE document_language AS ENUM ('ar', 'en', 'bilingual');
CREATE TYPE document_layout AS ENUM ('SIDE_BY_SIDE', 'AR_ONLY', 'EN_ONLY');

-- External sync enums
CREATE TYPE sync_status_general AS ENUM (
  'SUCCESS', 'API_ERROR', 'ZATCA_ERROR', 'NETWORK_ERROR', 'CONFIG_ERROR'
);
CREATE TYPE verification_status AS ENUM (
  'VERIFIED', 'MISMATCH', 'NOT_FOUND', 'API_ERROR', 'NETWORK_ERROR', 'CONFIG_ERROR'
);

-- Lead enums
CREATE TYPE lead_status AS ENUM ('PENDING', 'REVIEWED', 'APPROVED', 'REJECTED');
CREATE TYPE account_type AS ENUM ('CLIENT', 'SUPPLIER');

-- Product addition request enums
CREATE TYPE product_request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
