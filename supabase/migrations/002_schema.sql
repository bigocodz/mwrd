-- ============================================================
-- 002_schema.sql
-- Core table definitions (dependency order)
-- All Convex _id => UUID, _creationTime => created_at TIMESTAMPTZ
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- AUTH-ADJACENT TABLES
-- ============================================================

-- Pending users (invites / pre-registration whitelist)
CREATE TABLE pending_users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT NOT NULL UNIQUE,
  role           user_role NOT NULL DEFAULT 'CLIENT',
  company_name   TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Client team-member invite fields
  parent_client_id UUID,             -- references profiles(id) — set after profiles exists
  team_role      team_role,
  full_name      TEXT,
  job_title      TEXT,
  phone          TEXT
);

-- Profiles (one per user, role-aware)
CREATE TABLE profiles (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role                      user_role NOT NULL,
  status                    profile_status NOT NULL DEFAULT 'PENDING',
  kyc_status                kyc_status NOT NULL DEFAULT 'INCOMPLETE',
  company_name              TEXT,
  public_id                 TEXT UNIQUE,
  credit_limit              NUMERIC(18,4) DEFAULT 0,
  current_balance           NUMERIC(18,4) DEFAULT 0,
  payment_terms             payment_terms,
  client_margin             NUMERIC(6,4),
  frozen_at                 TIMESTAMPTZ,
  freeze_reason             TEXT,
  frozen_by                 UUID REFERENCES profiles(id),
  must_change_password      BOOLEAN DEFAULT FALSE,
  is_preferred              BOOLEAN DEFAULT FALSE,
  preferred_note            TEXT,
  preferred_at              TIMESTAMPTZ,
  preferred_by              UUID REFERENCES profiles(id),
  -- Wafeq
  wafeq_contact_id          TEXT,
  wafeq_contact_synced_at   TIMESTAMPTZ,
  -- Legal entity
  legal_name_ar             TEXT,
  legal_name_en             TEXT,
  cr_number                 TEXT,
  vat_number                TEXT,
  national_address          JSONB,
  -- Banking (suppliers)
  iban                      TEXT,
  bank_name                 TEXT,
  bank_account_holder       TEXT,
  -- Wathq
  wathq_status              wathq_status DEFAULT 'UNVERIFIED',
  wathq_verified_at         TIMESTAMPTZ,
  wathq_verified_legal_name TEXT,
  -- SPL
  spl_status                spl_status DEFAULT 'UNVERIFIED',
  spl_verified_at           TIMESTAMPTZ,
  spl_short_address         TEXT,
  -- Preferences
  preferred_language        preferred_language DEFAULT 'ar',
  show_hijri                BOOLEAN DEFAULT TRUE,
  -- Stamps / signatures (Supabase Storage paths)
  stamp_storage_path        TEXT,
  stamp_uploaded_at         TIMESTAMPTZ,
  signature_storage_path    TEXT,
  signature_uploaded_at     TIMESTAMPTZ,
  -- Client team model
  parent_client_id          UUID REFERENCES profiles(id),
  team_role                 team_role,
  full_name                 TEXT,
  job_title                 TEXT,
  phone                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CATEGORY TREE
-- ============================================================

CREATE TABLE categories (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id               UUID REFERENCES categories(id),
  level                   SMALLINT NOT NULL DEFAULT 0 CHECK (level BETWEEN 0 AND 3),
  slug                    TEXT NOT NULL,
  name_ar                 TEXT NOT NULL,
  name_en                 TEXT NOT NULL,
  description_ar          TEXT,
  description_en          TEXT,
  default_uom             TEXT,
  tax_class               tax_class,
  attribute_schema        TEXT,                          -- JSON-encoded attr schema
  display_order           INTEGER,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  status                  category_status NOT NULL DEFAULT 'ACTIVE',
  proposed_by             UUID REFERENCES profiles(id),
  proposed_justification  TEXT,
  decided_by              UUID REFERENCES profiles(id),
  decided_at              TIMESTAMPTZ,
  decision_note           TEXT,
  created_by              UUID REFERENCES profiles(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PRODUCT CATALOG
-- ============================================================

CREATE TABLE master_products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en             TEXT NOT NULL,
  name_ar             TEXT NOT NULL,
  description_en      TEXT,
  description_ar      TEXT,
  category_id         UUID NOT NULL REFERENCES categories(id),
  sku                 TEXT,
  brand               TEXT,
  images              TEXT[] NOT NULL DEFAULT '{}',
  specs               JSONB,
  pack_types          JSONB NOT NULL DEFAULT '[]',       -- array of pack type objects
  status              product_status NOT NULL DEFAULT 'DRAFT',
  display_order       INTEGER,
  created_by          UUID NOT NULL REFERENCES profiles(id),
  updated_at          TIMESTAMPTZ,
  deprecated_at       TIMESTAMPTZ,
  deprecation_reason  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Supplier offers (the "products" table in Convex)
CREATE TABLE products (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id           UUID NOT NULL REFERENCES profiles(id),
  name                  TEXT NOT NULL,
  description           TEXT,
  category              TEXT NOT NULL,                   -- legacy plain-text
  subcategory           TEXT,
  category_id           UUID REFERENCES categories(id),
  subcategory_id        UUID REFERENCES categories(id),
  master_product_id     UUID REFERENCES master_products(id),
  pack_type_code        TEXT,
  sku                   TEXT,
  brand                 TEXT,
  images                TEXT[] NOT NULL DEFAULT '{}',
  cost_price            NUMERIC(18,4) NOT NULL,
  lead_time_days        INTEGER NOT NULL,
  moq                   INTEGER,
  auto_quote            BOOLEAN DEFAULT FALSE,
  review_window         auto_quote_review_window,
  availability_status   availability_status NOT NULL DEFAULT 'AVAILABLE',
  approval_status       product_approval_status NOT NULL DEFAULT 'PENDING',
  rejection_reason      TEXT,
  stock_quantity        INTEGER,
  low_stock_threshold   INTEGER,
  stock_updated_at      TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Product addition requests
CREATE TABLE product_addition_requests (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id               UUID NOT NULL REFERENCES profiles(id),
  proposed_name_en          TEXT NOT NULL,
  proposed_name_ar          TEXT NOT NULL,
  proposed_description_en   TEXT,
  proposed_description_ar   TEXT,
  category_id               UUID NOT NULL REFERENCES categories(id),
  proposed_sku              TEXT,
  proposed_brand            TEXT,
  images                    TEXT[] NOT NULL DEFAULT '{}',
  specs                     JSONB,
  proposed_pack_types       JSONB NOT NULL DEFAULT '[]',
  justification             TEXT,
  status                    product_request_status NOT NULL DEFAULT 'PENDING',
  admin_notes               TEXT,
  rejection_reason          TEXT,
  decided_by                UUID REFERENCES profiles(id),
  decided_at                TIMESTAMPTZ,
  created_master_product_id UUID REFERENCES master_products(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bundles
CREATE TABLE bundles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en         TEXT NOT NULL,
  name_ar         TEXT NOT NULL,
  description_en  TEXT,
  description_ar  TEXT,
  category_id     UUID REFERENCES categories(id),
  image_url       TEXT,
  status          bundle_status NOT NULL DEFAULT 'DRAFT',
  display_order   INTEGER,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  updated_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bundle_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id           UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  master_product_id   UUID NOT NULL REFERENCES master_products(id),
  pack_type_code      TEXT NOT NULL,
  quantity            NUMERIC(12,4) NOT NULL,
  display_order       INTEGER,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RFQ / PROCUREMENT FLOW
-- ============================================================

CREATE TABLE rfqs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         UUID NOT NULL REFERENCES profiles(id),
  status            rfq_status NOT NULL DEFAULT 'OPEN',
  category          TEXT,
  template_key      TEXT,
  expiry_date       TEXT,
  required_by       TEXT,
  delivery_location TEXT,
  notes             TEXT,
  cost_center_id    UUID,                                -- FK added after cost_centers
  branch_id         UUID,                                -- FK added after branches
  department_id     UUID,                                -- FK added after departments
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rfq_items (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id                    UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  product_id                UUID REFERENCES products(id),
  master_product_id         UUID REFERENCES master_products(id),
  pack_type_code            TEXT,
  custom_item_description   TEXT,
  quantity                  NUMERIC(12,4) NOT NULL,
  flexibility               item_flexibility NOT NULL DEFAULT 'EXACT_MATCH',
  special_notes             TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rfq_supplier_assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id       UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_id  UUID NOT NULL REFERENCES profiles(id),
  assigned_at  TIMESTAMPTZ DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rfq_id, supplier_id)
);

CREATE TABLE quotes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id                UUID NOT NULL REFERENCES rfqs(id),
  supplier_id           UUID NOT NULL REFERENCES profiles(id),
  status                quote_status NOT NULL DEFAULT 'PENDING_ADMIN',
  source                quote_source DEFAULT 'MANUAL',
  review_until          TIMESTAMPTZ,
  reviewed_by           UUID REFERENCES profiles(id),
  reviewed_at           TIMESTAMPTZ,
  supplier_notes        TEXT,
  revision_count        INTEGER DEFAULT 0,
  latest_document_id    UUID,                            -- FK after generated_documents
  latest_document_hash  TEXT,
  latest_document_at    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quote_items (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id                 UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  rfq_item_id              UUID NOT NULL REFERENCES rfq_items(id),
  is_quoted                BOOLEAN NOT NULL DEFAULT TRUE,
  supplier_product_id      UUID REFERENCES products(id),
  alternative_product_id   UUID REFERENCES products(id),
  master_product_id        UUID REFERENCES master_products(id),
  pack_type_code           TEXT,
  cost_price               NUMERIC(18,4),
  lead_time_days           INTEGER,
  margin_percent           NUMERIC(8,4),
  final_price_before_vat   NUMERIC(18,4),
  final_price_with_vat     NUMERIC(18,4),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quote_revision_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id    UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  rfq_id      UUID NOT NULL REFERENCES rfqs(id),
  actor_id    UUID NOT NULL REFERENCES profiles(id),
  actor_role  actor_role NOT NULL,
  event_type  quote_revision_event_type NOT NULL,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE procurement_attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id        UUID REFERENCES rfqs(id),
  quote_id      UUID REFERENCES quotes(id),
  uploaded_by   UUID NOT NULL REFERENCES profiles(id),
  document_type procurement_document_type NOT NULL DEFAULT 'OTHER',
  name          TEXT NOT NULL,
  storage_path  TEXT,                                    -- Supabase Storage path
  content_type  TEXT,
  size          BIGINT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ORDERS
-- ============================================================

CREATE TABLE client_purchase_orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id                UUID NOT NULL REFERENCES rfqs(id),
  client_id             UUID NOT NULL REFERENCES profiles(id),
  transaction_ref       TEXT NOT NULL UNIQUE,
  award_mode            cpo_award_mode NOT NULL,
  status                cpo_status NOT NULL DEFAULT 'OPEN',
  total_before_vat      NUMERIC(18,4) NOT NULL,
  total_with_vat        NUMERIC(18,4) NOT NULL,
  delivery_location     TEXT,
  required_by           TEXT,
  notes                 TEXT,
  cancelled_at          TIMESTAMPTZ,
  cancelled_reason      TEXT,
  latest_document_id    UUID,
  latest_document_hash  TEXT,
  latest_document_at    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id                UUID NOT NULL REFERENCES rfqs(id),
  quote_id              UUID NOT NULL REFERENCES quotes(id),
  client_id             UUID NOT NULL REFERENCES profiles(id),
  supplier_id           UUID NOT NULL REFERENCES profiles(id),
  client_po_id          UUID REFERENCES client_purchase_orders(id),
  transaction_ref       TEXT,
  status                order_status NOT NULL DEFAULT 'PENDING_CONFIRMATION',
  total_before_vat      NUMERIC(18,4) NOT NULL,
  total_with_vat        NUMERIC(18,4) NOT NULL,
  delivery_location     TEXT,
  required_by           TEXT,
  notes                 TEXT,
  confirmed_at          TIMESTAMPTZ,
  preparing_at          TIMESTAMPTZ,
  dispatched_at         TIMESTAMPTZ,
  delivered_at          TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  cancelled_reason      TEXT,
  carrier               TEXT,
  tracking_number       TEXT,
  tracking_url          TEXT,
  estimated_delivery_at TIMESTAMPTZ,
  pod_storage_path      TEXT,                            -- Supabase Storage path
  pod_name              TEXT,
  pod_uploaded_at       TIMESTAMPTZ,
  dispute_status        dispute_status,
  dispute_reason        TEXT,
  dispute_opened_by     UUID REFERENCES profiles(id),
  dispute_opened_at     TIMESTAMPTZ,
  dispute_resolution    TEXT,
  dispute_resolved_by   UUID REFERENCES profiles(id),
  dispute_resolved_at   TIMESTAMPTZ,
  latest_document_id    UUID,
  latest_document_hash  TEXT,
  latest_document_at    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  actor_id    UUID NOT NULL REFERENCES profiles(id),
  actor_role  actor_role NOT NULL,
  event_type  order_event_type NOT NULL,
  message     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- DELIVERY / RECEIVING
-- ============================================================

CREATE TABLE delivery_notes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID NOT NULL REFERENCES orders(id),
  supplier_id           UUID NOT NULL REFERENCES profiles(id),
  client_id             UUID NOT NULL REFERENCES profiles(id),
  dn_number             TEXT NOT NULL UNIQUE,
  issued_at             TIMESTAMPTZ NOT NULL,
  issued_by             UUID NOT NULL REFERENCES profiles(id),
  status                delivery_note_status NOT NULL DEFAULT 'DRAFT',
  carrier               TEXT,
  tracking_number       TEXT,
  expected_delivery_at  TIMESTAMPTZ,
  notes                 TEXT,
  photo_storage_paths   TEXT[] NOT NULL DEFAULT '{}',
  cancelled_at          TIMESTAMPTZ,
  cancelled_reason      TEXT,
  latest_document_id    UUID,
  latest_document_hash  TEXT,
  latest_document_at    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE delivery_note_lines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id  UUID NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  order_id          UUID NOT NULL REFERENCES orders(id),
  quote_item_id     UUID REFERENCES quote_items(id),
  rfq_item_id       UUID REFERENCES rfq_items(id),
  description       TEXT NOT NULL,
  ordered_qty       NUMERIC(12,4) NOT NULL,
  shipped_qty       NUMERIC(12,4) NOT NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE goods_receipt_notes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID NOT NULL REFERENCES orders(id),
  client_id             UUID NOT NULL REFERENCES profiles(id),
  supplier_id           UUID NOT NULL REFERENCES profiles(id),
  grn_number            TEXT NOT NULL UNIQUE,
  received_at           TIMESTAMPTZ NOT NULL,
  received_by           UUID NOT NULL REFERENCES profiles(id),
  status                grn_status NOT NULL DEFAULT 'DRAFT',
  has_discrepancy       BOOLEAN NOT NULL DEFAULT FALSE,
  discrepancy_summary   TEXT,
  notes                 TEXT,
  photo_storage_paths   TEXT[] NOT NULL DEFAULT '{}',
  resolution            TEXT,
  resolved_by           UUID REFERENCES profiles(id),
  resolved_at           TIMESTAMPTZ,
  latest_document_id    UUID,
  latest_document_hash  TEXT,
  latest_document_at    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE grn_lines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id        UUID NOT NULL REFERENCES goods_receipt_notes(id) ON DELETE CASCADE,
  order_id      UUID NOT NULL REFERENCES orders(id),
  quote_item_id UUID REFERENCES quote_items(id),
  rfq_item_id   UUID REFERENCES rfq_items(id),
  description   TEXT NOT NULL,
  ordered_qty   NUMERIC(12,4) NOT NULL,
  received_qty  NUMERIC(12,4) NOT NULL,
  condition     grn_line_condition NOT NULL DEFAULT 'GOOD',
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INVOICING & PAYMENTS
-- ============================================================

CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES profiles(id),
  order_id        TEXT,
  amount          NUMERIC(18,4) NOT NULL,
  payment_method  payment_method NOT NULL,
  status          payment_status NOT NULL DEFAULT 'PENDING',
  bank_reference  TEXT,
  confirmed_by    UUID REFERENCES profiles(id),
  confirmed_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id  UUID NOT NULL REFERENCES payments(id),
  admin_id    UUID NOT NULL REFERENCES profiles(id),
  action      TEXT NOT NULL,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE supplier_payouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id     UUID NOT NULL REFERENCES profiles(id),
  order_id        TEXT,
  amount          NUMERIC(18,4) NOT NULL,
  payment_method  payout_method NOT NULL,
  status          payout_status NOT NULL DEFAULT 'PENDING',
  bank_reference  TEXT,
  recorded_by     UUID NOT NULL REFERENCES profiles(id),
  notes           TEXT,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE client_invoices (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id               UUID NOT NULL REFERENCES profiles(id),
  order_id                UUID REFERENCES orders(id),
  invoice_number          TEXT NOT NULL UNIQUE,
  issue_date              TEXT NOT NULL,
  due_date                TEXT NOT NULL,
  subtotal                NUMERIC(18,4) NOT NULL,
  vat_amount              NUMERIC(18,4) NOT NULL,
  total_amount            NUMERIC(18,4) NOT NULL,
  notes                   TEXT,
  status                  invoice_status NOT NULL DEFAULT 'PENDING_PAYMENT',
  issued_by               UUID NOT NULL REFERENCES profiles(id),
  paid_at                 TIMESTAMPTZ,
  paid_reference          TEXT,
  void_reason             TEXT,
  voided_at               TIMESTAMPTZ,
  last_reminder_at        TIMESTAMPTZ,
  reminder_count          INTEGER DEFAULT 0,
  matched_payment_id      UUID REFERENCES payments(id),
  latest_document_id      UUID,
  latest_document_hash    TEXT,
  latest_document_at      TIMESTAMPTZ,
  -- Three-way match
  match_status            invoice_match_status,
  match_summary           TEXT,
  match_computed_at       TIMESTAMPTZ,
  matched_grn_ids         UUID[] DEFAULT '{}',
  -- Wafeq / ZATCA
  wafeq_invoice_id        TEXT,
  wafeq_environment       wafeq_environment,
  zatca_uuid              TEXT,
  zatca_status            TEXT,
  zatca_hash              TEXT,
  zatca_qr                TEXT,
  zatca_pdf_url           TEXT,
  zatca_pdf_storage_path  TEXT,
  zatca_cleared_at        TIMESTAMPTZ,
  zatca_last_error        TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_allocations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id    UUID NOT NULL REFERENCES payments(id),
  invoice_id    UUID NOT NULL REFERENCES client_invoices(id),
  amount        NUMERIC(18,4) NOT NULL,
  allocated_by  UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE client_invoice_adjustments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id          UUID NOT NULL REFERENCES client_invoices(id),
  client_id           UUID NOT NULL REFERENCES profiles(id),
  type                invoice_adjustment_type NOT NULL,
  adjustment_number   TEXT NOT NULL UNIQUE,
  issue_date          TEXT NOT NULL,
  subtotal            NUMERIC(18,4) NOT NULL,
  vat_amount          NUMERIC(18,4) NOT NULL,
  total_amount        NUMERIC(18,4) NOT NULL,
  reason              TEXT NOT NULL,
  notes               TEXT,
  status              invoice_adjustment_status NOT NULL DEFAULT 'PENDING_CLEARANCE',
  issued_by           UUID NOT NULL REFERENCES profiles(id),
  void_reason         TEXT,
  voided_at           TIMESTAMPTZ,
  wafeq_adjustment_id TEXT,
  wafeq_environment   wafeq_environment,
  zatca_uuid          TEXT,
  zatca_status        TEXT,
  zatca_hash          TEXT,
  zatca_qr            TEXT,
  zatca_pdf_url       TEXT,
  zatca_cleared_at    TIMESTAMPTZ,
  zatca_last_error    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE supplier_invoices (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id             UUID NOT NULL REFERENCES profiles(id),
  order_id                UUID NOT NULL REFERENCES orders(id),
  invoice_number          TEXT NOT NULL,
  issue_date              TEXT NOT NULL,
  due_date                TEXT,
  subtotal                NUMERIC(18,4) NOT NULL,
  vat_amount              NUMERIC(18,4) NOT NULL,
  total_amount            NUMERIC(18,4) NOT NULL,
  notes                   TEXT,
  storage_path            TEXT,
  file_name               TEXT,
  status                  supplier_invoice_status NOT NULL DEFAULT 'SUBMITTED',
  rejection_reason        TEXT,
  reviewed_by             UUID REFERENCES profiles(id),
  reviewed_at             TIMESTAMPTZ,
  paid_at                 TIMESTAMPTZ,
  paid_reference          TEXT,
  wafeq_bill_id           TEXT,
  wafeq_environment       wafeq_environment,
  supplier_zatca_uuid     TEXT,
  supplier_zatca_pdf_url  TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- APPROVAL WORKFLOW
-- ============================================================

CREATE TABLE cost_centers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES profiles(id),
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  notes       TEXT,
  archived    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE branches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES profiles(id),
  name        TEXT NOT NULL,
  location    TEXT,
  notes       TEXT,
  archived    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES profiles(id),
  name        TEXT NOT NULL,
  notes       TEXT,
  archived    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add deferred FK for rfqs → cost_centers / branches / departments
ALTER TABLE rfqs ADD CONSTRAINT fk_rfqs_cost_center
  FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id);
ALTER TABLE rfqs ADD CONSTRAINT fk_rfqs_branch
  FOREIGN KEY (branch_id) REFERENCES branches(id);
ALTER TABLE rfqs ADD CONSTRAINT fk_rfqs_department
  FOREIGN KEY (department_id) REFERENCES departments(id);

CREATE TABLE approval_rules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             UUID NOT NULL REFERENCES profiles(id),
  name                  TEXT NOT NULL,
  min_amount            NUMERIC(18,4) NOT NULL,
  max_amount            NUMERIC(18,4),
  category              TEXT,
  cost_center_id        UUID REFERENCES cost_centers(id),
  branch_id             UUID REFERENCES branches(id),
  department_id         UUID REFERENCES departments(id),
  enabled               BOOLEAN NOT NULL DEFAULT TRUE,
  notes                 TEXT,
  auto_approve_threshold NUMERIC(18,4),
  escalation_hours      INTEGER,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE approval_steps (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id             UUID NOT NULL REFERENCES approval_rules(id) ON DELETE CASCADE,
  step_index          INTEGER NOT NULL,
  parallel_group      INTEGER NOT NULL,
  label               TEXT NOT NULL,
  approver_admin_id   UUID REFERENCES profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE approval_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id        UUID NOT NULL REFERENCES quotes(id),
  rfq_id          UUID NOT NULL REFERENCES rfqs(id),
  client_id       UUID NOT NULL REFERENCES profiles(id),
  rule_id         UUID NOT NULL REFERENCES approval_rules(id),
  rule_name       TEXT NOT NULL,
  quote_total     NUMERIC(18,4) NOT NULL,
  status          approval_request_status NOT NULL DEFAULT 'PENDING',
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at      TIMESTAMPTZ,
  decided_by      UUID REFERENCES profiles(id),
  decision_note   TEXT,
  current_group   INTEGER,
  total_groups    INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE approval_step_decisions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id            UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  step_id               UUID NOT NULL REFERENCES approval_steps(id),
  rule_id               UUID NOT NULL REFERENCES approval_rules(id),
  parallel_group        INTEGER NOT NULL,
  label                 TEXT NOT NULL,
  approver_admin_id     UUID REFERENCES profiles(id),
  status                approval_step_status NOT NULL DEFAULT 'PENDING',
  decided_at            TIMESTAMPTZ,
  decided_by            UUID REFERENCES profiles(id),
  decision_note         TEXT,
  escalated_at          TIMESTAMPTZ,
  activated_at          TIMESTAMPTZ,
  signature_storage_path TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CONTRACTS
-- ============================================================

CREATE TABLE contracts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  client_id         UUID REFERENCES profiles(id),
  supplier_id       UUID NOT NULL REFERENCES profiles(id),
  status            contract_status NOT NULL DEFAULT 'DRAFT',
  start_date        TEXT NOT NULL,
  end_date          TEXT,
  payment_terms     TEXT,
  discount_percent  NUMERIC(6,4),
  terms             TEXT,
  notes             TEXT,
  created_by        UUID NOT NULL REFERENCES profiles(id),
  terminated_at     TIMESTAMPTZ,
  terminated_reason TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE contract_lines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id   UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id),
  description   TEXT NOT NULL,
  unit_price    NUMERIC(18,4) NOT NULL,
  min_quantity  NUMERIC(12,4),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id),
  title               TEXT NOT NULL,
  message             TEXT,
  read                BOOLEAN NOT NULL DEFAULT FALSE,
  link                TEXT,
  event_type          TEXT,
  dispatched_at       TIMESTAMPTZ,
  dispatched_channels TEXT[] DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notification_channel_prefs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id),
  event_type  TEXT NOT NULL,
  in_app      BOOLEAN,
  email       BOOLEAN,
  sms         BOOLEAN,
  whatsapp    BOOLEAN,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_type)
);

CREATE TABLE notification_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT NOT NULL,
  subject_ar  TEXT NOT NULL,
  subject_en  TEXT NOT NULL,
  body_ar     TEXT NOT NULL,
  body_en     TEXT NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notification_dispatch_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  channel         notification_channel NOT NULL,
  status          notification_dispatch_status NOT NULL,
  target          TEXT,
  error_message   TEXT,
  duration_ms     INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- COMMENTS
-- ============================================================

CREATE TABLE comments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type           comment_target_type NOT NULL,
  target_id             TEXT NOT NULL,               -- polymorphic UUID as text
  visibility            comment_visibility NOT NULL DEFAULT 'INTERNAL',
  body                  TEXT NOT NULL,
  author_profile_id     UUID NOT NULL REFERENCES profiles(id),
  author_role           actor_role NOT NULL,
  mentioned_profile_ids UUID[] DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- KYC
-- ============================================================

CREATE TABLE kyc_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id),
  document_type   kyc_document_type NOT NULL,
  name            TEXT NOT NULL,
  storage_path    TEXT NOT NULL,                     -- Supabase Storage path
  content_type    TEXT,
  size            BIGINT,
  expiry_date     TEXT,
  status          kyc_document_status NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT,
  reviewed_by     UUID REFERENCES profiles(id),
  reviewed_at     TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MARGIN SETTINGS
-- ============================================================

CREATE TABLE margin_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            margin_type NOT NULL,
  category        TEXT,
  client_id       UUID REFERENCES profiles(id),
  margin_percent  NUMERIC(8,4) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- REVIEWS
-- ============================================================

CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES profiles(id),
  supplier_id UUID NOT NULL REFERENCES profiles(id),
  order_id    TEXT,
  rating      NUMERIC(3,1) NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CLIENT CATALOG (favorites / cart)
-- ============================================================

CREATE TABLE client_catalog_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES profiles(id),
  product_id      UUID NOT NULL REFERENCES products(id),
  alias           TEXT,
  notes           TEXT,
  pinned          BOOLEAN DEFAULT FALSE,
  hidden          BOOLEAN DEFAULT FALSE,
  cart_quantity   NUMERIC(12,4),
  cart_expires_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, product_id)
);

-- ============================================================
-- RFQ SCHEDULES (recurring orders)
-- ============================================================

CREATE TABLE rfq_schedules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES profiles(id),
  name        TEXT NOT NULL,
  cadence     rfq_schedule_cadence NOT NULL,
  next_run_at TIMESTAMPTZ NOT NULL,
  last_run_at TIMESTAMPTZ,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  template    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE admin_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        UUID NOT NULL REFERENCES profiles(id),
  action          TEXT NOT NULL,
  target_user_id  UUID REFERENCES profiles(id),
  target_type     TEXT,
  target_id       TEXT,
  details         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id     UUID REFERENCES auth.users(id),
  actor_profile_id  UUID REFERENCES profiles(id),
  actor_role        actor_role,
  actor_public_id   TEXT,
  action            TEXT NOT NULL,
  target_type       TEXT NOT NULL,
  target_id         TEXT,
  before            JSONB,
  after             JSONB,
  details           JSONB,
  ip                TEXT,
  user_agent        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- DOCUMENT ENGINE
-- ============================================================

CREATE TABLE document_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key             TEXT NOT NULL,
  title_ar        TEXT NOT NULL,
  title_en        TEXT NOT NULL,
  body_ar         TEXT NOT NULL,
  body_en         TEXT NOT NULL,
  bilingual_layout document_layout NOT NULL DEFAULT 'SIDE_BY_SIDE',
  is_default      BOOLEAN NOT NULL DEFAULT TRUE,
  description     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE generated_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key  TEXT NOT NULL,
  target_type   TEXT NOT NULL,
  target_id     TEXT NOT NULL,
  version       INTEGER NOT NULL DEFAULT 1,
  language      document_language NOT NULL DEFAULT 'bilingual',
  title         TEXT NOT NULL,
  content_html  TEXT NOT NULL,
  content_hash  TEXT NOT NULL,
  generated_by  UUID NOT NULL REFERENCES profiles(id),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add deferred FK for quotes / orders / invoices → generated_documents
ALTER TABLE quotes ADD CONSTRAINT fk_quotes_latest_doc
  FOREIGN KEY (latest_document_id) REFERENCES generated_documents(id);
ALTER TABLE orders ADD CONSTRAINT fk_orders_latest_doc
  FOREIGN KEY (latest_document_id) REFERENCES generated_documents(id);
ALTER TABLE client_purchase_orders ADD CONSTRAINT fk_cpo_latest_doc
  FOREIGN KEY (latest_document_id) REFERENCES generated_documents(id);
ALTER TABLE delivery_notes ADD CONSTRAINT fk_dn_latest_doc
  FOREIGN KEY (latest_document_id) REFERENCES generated_documents(id);
ALTER TABLE goods_receipt_notes ADD CONSTRAINT fk_grn_latest_doc
  FOREIGN KEY (latest_document_id) REFERENCES generated_documents(id);
ALTER TABLE client_invoices ADD CONSTRAINT fk_ci_latest_doc
  FOREIGN KEY (latest_document_id) REFERENCES generated_documents(id);

-- ============================================================
-- EXTERNAL SYNC LOGS
-- ============================================================

CREATE TABLE wafeq_sync_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation       TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  environment     wafeq_environment NOT NULL,
  target_type     TEXT NOT NULL,
  target_id       TEXT NOT NULL,
  status          sync_status_general NOT NULL,
  http_status     INTEGER,
  error_code      TEXT,
  error_message   TEXT,
  request_summary  JSONB,
  response_summary JSONB,
  duration_ms     INTEGER,
  actor_profile_id UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE wathq_sync_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation         TEXT NOT NULL,
  environment       TEXT NOT NULL,
  target_type       TEXT NOT NULL,
  target_id         TEXT NOT NULL,
  cr_number         TEXT,
  status            verification_status NOT NULL,
  http_status       INTEGER,
  error_code        TEXT,
  error_message     TEXT,
  response_summary  JSONB,
  duration_ms       INTEGER,
  actor_profile_id  UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE spl_sync_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation         TEXT NOT NULL,
  environment       TEXT NOT NULL,
  target_type       TEXT NOT NULL,
  target_id         TEXT NOT NULL,
  short_address     TEXT,
  status            verification_status NOT NULL,
  http_status       INTEGER,
  error_code        TEXT,
  error_message     TEXT,
  response_summary  JSONB,
  duration_ms       INTEGER,
  actor_profile_id  UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- LEADS
-- ============================================================

CREATE TABLE interest_submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT NOT NULL,
  company_name  TEXT,
  cr_number     TEXT,
  vat_number    TEXT,
  email         TEXT NOT NULL,
  phone         TEXT,
  account_type  account_type,
  notes         TEXT,
  status        lead_status NOT NULL DEFAULT 'PENDING',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
