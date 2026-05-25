-- ============================================================
-- 004_rls.sql
-- Row Level Security — replaces requireClient/requireSupplier/requireAdmin
-- guards from convex/lib.ts. Data isolation moves from application layer
-- to the database layer.
-- ============================================================

-- Helper function: get current user's profile
CREATE OR REPLACE FUNCTION auth_profile()
RETURNS profiles AS $$
  SELECT * FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function: get the org-owner id for the current user
-- (team members return parent_client_id; owners return their own id)
CREATE OR REPLACE FUNCTION auth_org_id()
RETURNS UUID AS $$
  SELECT COALESCE(parent_client_id, id)
  FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: is current user an admin or auditor?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role IN ('ADMIN', 'AUDITOR')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: is current user a client (any team role)?
CREATE OR REPLACE FUNCTION is_client()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'CLIENT'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: is current user a supplier?
CREATE OR REPLACE FUNCTION is_supplier()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'SUPPLIER'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "profiles_self_read" ON profiles
  FOR SELECT USING (user_id = auth.uid());

-- Team members can read their org owner's profile
CREATE POLICY "profiles_org_read" ON profiles
  FOR SELECT USING (
    id = (SELECT parent_client_id FROM profiles WHERE user_id = auth.uid())
  );

-- Users can update their own profile
CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE USING (user_id = auth.uid());

-- Admins / auditors see all profiles
CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL USING (is_admin());

-- ============================================================
-- PENDING_USERS
-- ============================================================
ALTER TABLE pending_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pending_users_admin_all" ON pending_users
  FOR ALL USING (is_admin());

-- ============================================================
-- CATEGORIES
-- ============================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read active categories
CREATE POLICY "categories_read_active" ON categories
  FOR SELECT USING (is_active = TRUE AND status = 'ACTIVE');

-- Admins manage all
CREATE POLICY "categories_admin_all" ON categories
  FOR ALL USING (is_admin());

-- ============================================================
-- MASTER PRODUCTS
-- ============================================================
ALTER TABLE master_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "master_products_read_active" ON master_products
  FOR SELECT USING (status = 'ACTIVE');

CREATE POLICY "master_products_admin_all" ON master_products
  FOR ALL USING (is_admin());

-- ============================================================
-- PRODUCTS (supplier offers)
-- ============================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Suppliers see only their own products
CREATE POLICY "products_supplier_own" ON products
  FOR ALL USING (
    supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Clients see approved products
CREATE POLICY "products_client_read" ON products
  FOR SELECT USING (is_client() AND approval_status = 'APPROVED');

-- Admins see everything
CREATE POLICY "products_admin_all" ON products
  FOR ALL USING (is_admin());

-- ============================================================
-- BUNDLES
-- ============================================================
ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bundles_read_active" ON bundles
  FOR SELECT USING (status = 'ACTIVE');

CREATE POLICY "bundles_admin_all" ON bundles
  FOR ALL USING (is_admin());

ALTER TABLE bundle_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bundle_items_read" ON bundle_items FOR SELECT USING (TRUE);
CREATE POLICY "bundle_items_admin" ON bundle_items FOR ALL USING (is_admin());

-- ============================================================
-- PRODUCT ADDITION REQUESTS
-- ============================================================
ALTER TABLE product_addition_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "par_supplier_own" ON product_addition_requests
  FOR ALL USING (
    supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "par_admin_all" ON product_addition_requests
  FOR ALL USING (is_admin());

-- ============================================================
-- RFQs
-- ============================================================
ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;

-- Clients see their org's RFQs
CREATE POLICY "rfqs_client_org" ON rfqs
  FOR ALL USING (client_id = auth_org_id() AND is_client());

-- Admins see all
CREATE POLICY "rfqs_admin_all" ON rfqs
  FOR ALL USING (is_admin());

-- Suppliers see RFQs they're assigned to
CREATE POLICY "rfqs_supplier_assigned" ON rfqs
  FOR SELECT USING (
    is_supplier() AND EXISTS (
      SELECT 1 FROM rfq_supplier_assignments rsa
      WHERE rsa.rfq_id = rfqs.id
      AND rsa.supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- rfq_items
ALTER TABLE rfq_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rfq_items_client" ON rfq_items
  FOR ALL USING (
    rfq_id IN (SELECT id FROM rfqs WHERE client_id = auth_org_id() AND is_client())
  );

CREATE POLICY "rfq_items_admin" ON rfq_items FOR ALL USING (is_admin());

CREATE POLICY "rfq_items_supplier" ON rfq_items
  FOR SELECT USING (
    is_supplier() AND rfq_id IN (
      SELECT rfq_id FROM rfq_supplier_assignments
      WHERE supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- rfq_supplier_assignments
ALTER TABLE rfq_supplier_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rsa_admin_all" ON rfq_supplier_assignments FOR ALL USING (is_admin());
CREATE POLICY "rsa_supplier_own" ON rfq_supplier_assignments
  FOR SELECT USING (
    supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- ============================================================
-- QUOTES
-- ============================================================
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Suppliers manage their own quotes
CREATE POLICY "quotes_supplier_own" ON quotes
  FOR ALL USING (
    supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) AND is_supplier()
  );

-- Clients see quotes sent to them (SENT_TO_CLIENT and ACCEPTED)
CREATE POLICY "quotes_client_visible" ON quotes
  FOR SELECT USING (
    is_client() AND status IN ('SENT_TO_CLIENT', 'CLIENT_REVISION_REQUESTED', 'ACCEPTED', 'REJECTED')
    AND rfq_id IN (SELECT id FROM rfqs WHERE client_id = auth_org_id())
  );

CREATE POLICY "quotes_admin_all" ON quotes FOR ALL USING (is_admin());

-- quote_items
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qi_supplier" ON quote_items
  FOR ALL USING (
    quote_id IN (
      SELECT id FROM quotes
      WHERE supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "qi_client" ON quote_items
  FOR SELECT USING (
    quote_id IN (
      SELECT q.id FROM quotes q
      JOIN rfqs r ON r.id = q.rfq_id
      WHERE r.client_id = auth_org_id() AND q.status IN ('SENT_TO_CLIENT', 'ACCEPTED')
    )
  );
CREATE POLICY "qi_admin" ON quote_items FOR ALL USING (is_admin());

-- quote_revision_events
ALTER TABLE quote_revision_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qre_supplier" ON quote_revision_events
  FOR ALL USING (
    is_admin() OR quote_id IN (
      SELECT id FROM quotes
      WHERE supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "qre_client" ON quote_revision_events
  FOR SELECT USING (
    rfq_id IN (SELECT id FROM rfqs WHERE client_id = auth_org_id())
  );

-- procurement_attachments
ALTER TABLE procurement_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pa_uploader" ON procurement_attachments
  FOR ALL USING (uploaded_by = (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "pa_admin" ON procurement_attachments FOR ALL USING (is_admin());

-- ============================================================
-- ORDERS
-- ============================================================
ALTER TABLE client_purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cpo_client" ON client_purchase_orders
  FOR ALL USING (client_id = auth_org_id() AND is_client());
CREATE POLICY "cpo_admin" ON client_purchase_orders FOR ALL USING (is_admin());

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_client" ON orders
  FOR ALL USING (client_id = auth_org_id() AND is_client());
CREATE POLICY "orders_supplier" ON orders
  FOR ALL USING (
    supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) AND is_supplier()
  );
CREATE POLICY "orders_admin" ON orders FOR ALL USING (is_admin());

ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "oe_parties" ON order_events
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders
      WHERE client_id = auth_org_id()
      OR supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "oe_admin" ON order_events FOR ALL USING (is_admin());
CREATE POLICY "oe_insert_parties" ON order_events
  FOR INSERT WITH CHECK (
    order_id IN (
      SELECT id FROM orders
      WHERE client_id = auth_org_id()
      OR supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- ============================================================
-- DELIVERY / GRN
-- ============================================================
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dn_supplier" ON delivery_notes
  FOR ALL USING (
    supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) AND is_supplier()
  );
CREATE POLICY "dn_client" ON delivery_notes
  FOR SELECT USING (client_id = auth_org_id() AND is_client());
CREATE POLICY "dn_admin" ON delivery_notes FOR ALL USING (is_admin());

ALTER TABLE delivery_note_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dnl_parties" ON delivery_note_lines
  FOR ALL USING (
    delivery_note_id IN (
      SELECT id FROM delivery_notes
      WHERE supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
      OR client_id = auth_org_id()
    )
  );
CREATE POLICY "dnl_admin" ON delivery_note_lines FOR ALL USING (is_admin());

ALTER TABLE goods_receipt_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grn_client" ON goods_receipt_notes
  FOR ALL USING (client_id = auth_org_id() AND is_client());
CREATE POLICY "grn_supplier_read" ON goods_receipt_notes
  FOR SELECT USING (
    supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) AND is_supplier()
  );
CREATE POLICY "grn_admin" ON goods_receipt_notes FOR ALL USING (is_admin());

ALTER TABLE grn_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grn_lines_parties" ON grn_lines
  FOR ALL USING (
    grn_id IN (
      SELECT id FROM goods_receipt_notes
      WHERE client_id = auth_org_id()
      OR supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "grn_lines_admin" ON grn_lines FOR ALL USING (is_admin());

-- ============================================================
-- PAYMENTS & INVOICES
-- ============================================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_client" ON payments
  FOR SELECT USING (client_id = auth_org_id() AND is_client());
CREATE POLICY "payments_admin" ON payments FOR ALL USING (is_admin());

ALTER TABLE payment_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pal_admin" ON payment_audit_logs FOR ALL USING (is_admin());

ALTER TABLE supplier_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payouts_supplier" ON supplier_payouts
  FOR SELECT USING (
    supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) AND is_supplier()
  );
CREATE POLICY "payouts_admin" ON supplier_payouts FOR ALL USING (is_admin());

ALTER TABLE client_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ci_client" ON client_invoices
  FOR SELECT USING (client_id = auth_org_id() AND is_client());
CREATE POLICY "ci_admin" ON client_invoices FOR ALL USING (is_admin());

ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pall_admin" ON payment_allocations FOR ALL USING (is_admin());
CREATE POLICY "pall_client_read" ON payment_allocations
  FOR SELECT USING (
    invoice_id IN (SELECT id FROM client_invoices WHERE client_id = auth_org_id())
  );

ALTER TABLE client_invoice_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cia_client_read" ON client_invoice_adjustments
  FOR SELECT USING (client_id = auth_org_id() AND is_client());
CREATE POLICY "cia_admin" ON client_invoice_adjustments FOR ALL USING (is_admin());

ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "si_supplier" ON supplier_invoices
  FOR ALL USING (
    supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) AND is_supplier()
  );
CREATE POLICY "si_admin" ON supplier_invoices FOR ALL USING (is_admin());

-- ============================================================
-- APPROVAL WORKFLOW
-- ============================================================
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cc_client_org" ON cost_centers
  FOR ALL USING (client_id = auth_org_id() AND is_client());
CREATE POLICY "cc_admin" ON cost_centers FOR ALL USING (is_admin());

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "br_client_org" ON branches
  FOR ALL USING (client_id = auth_org_id() AND is_client());
CREATE POLICY "br_admin" ON branches FOR ALL USING (is_admin());

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dep_client_org" ON departments
  FOR ALL USING (client_id = auth_org_id() AND is_client());
CREATE POLICY "dep_admin" ON departments FOR ALL USING (is_admin());

ALTER TABLE approval_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ar_client_org" ON approval_rules
  FOR ALL USING (client_id = auth_org_id() AND is_client());
CREATE POLICY "ar_admin" ON approval_rules FOR ALL USING (is_admin());

ALTER TABLE approval_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "as_client" ON approval_steps
  FOR SELECT USING (
    rule_id IN (SELECT id FROM approval_rules WHERE client_id = auth_org_id())
  );
CREATE POLICY "as_admin" ON approval_steps FOR ALL USING (is_admin());

ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "areq_client" ON approval_requests
  FOR SELECT USING (client_id = auth_org_id() AND is_client());
CREATE POLICY "areq_admin" ON approval_requests FOR ALL USING (is_admin());

ALTER TABLE approval_step_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asd_client" ON approval_step_decisions
  FOR SELECT USING (
    request_id IN (SELECT id FROM approval_requests WHERE client_id = auth_org_id())
  );
CREATE POLICY "asd_admin" ON approval_step_decisions FOR ALL USING (is_admin());

-- ============================================================
-- CONTRACTS
-- ============================================================
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contracts_client" ON contracts
  FOR SELECT USING (client_id = auth_org_id() AND is_client());
CREATE POLICY "contracts_supplier" ON contracts
  FOR SELECT USING (
    supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) AND is_supplier()
  );
CREATE POLICY "contracts_admin" ON contracts FOR ALL USING (is_admin());

ALTER TABLE contract_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cl_parties" ON contract_lines
  FOR SELECT USING (
    contract_id IN (
      SELECT id FROM contracts
      WHERE client_id = auth_org_id()
      OR supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "cl_admin" ON contract_lines FOR ALL USING (is_admin());

-- ============================================================
-- NOTIFICATIONS (Realtime subscriptions use these policies)
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_own" ON notifications
  FOR ALL USING (
    user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "notif_admin" ON notifications FOR ALL USING (is_admin());

ALTER TABLE notification_channel_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ncp_own" ON notification_channel_prefs
  FOR ALL USING (
    user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

ALTER TABLE notification_dispatch_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ndl_admin" ON notification_dispatch_log FOR ALL USING (is_admin());

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nt_admin" ON notification_templates FOR ALL USING (is_admin());
CREATE POLICY "nt_read_all" ON notification_templates FOR SELECT USING (TRUE);

-- ============================================================
-- COMMENTS
-- ============================================================
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- INTERNAL: admin only
CREATE POLICY "comments_internal_admin" ON comments
  FOR ALL USING (visibility = 'INTERNAL' AND is_admin());

-- CLIENT_THREAD: client + admin can see
CREATE POLICY "comments_client_thread" ON comments
  FOR SELECT USING (
    visibility = 'CLIENT_THREAD'
    AND (
      is_admin()
      OR (is_client() AND target_id IN (
        SELECT id::text FROM rfqs WHERE client_id = auth_org_id()
        UNION SELECT id::text FROM orders WHERE client_id = auth_org_id()
        UNION SELECT id::text FROM client_invoices WHERE client_id = auth_org_id()
      ))
    )
  );

-- SUPPLIER_THREAD: supplier + admin can see
CREATE POLICY "comments_supplier_thread" ON comments
  FOR SELECT USING (
    visibility = 'SUPPLIER_THREAD'
    AND (
      is_admin()
      OR (is_supplier() AND target_id IN (
        SELECT id::text FROM quotes WHERE supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        UNION SELECT id::text FROM orders WHERE supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
      ))
    )
  );

-- Authors can insert their own comments
CREATE POLICY "comments_insert" ON comments
  FOR INSERT WITH CHECK (
    author_profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- ============================================================
-- KYC
-- ============================================================
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kyc_own" ON kyc_documents
  FOR ALL USING (
    profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "kyc_admin" ON kyc_documents FOR ALL USING (is_admin());

-- ============================================================
-- CLIENT CATALOG
-- ============================================================
ALTER TABLE client_catalog_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cce_own" ON client_catalog_entries
  FOR ALL USING (client_id = auth_org_id() AND is_client());
CREATE POLICY "cce_admin" ON client_catalog_entries FOR SELECT USING (is_admin());

-- ============================================================
-- RFQ SCHEDULES
-- ============================================================
ALTER TABLE rfq_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rfq_sched_own" ON rfq_schedules
  FOR ALL USING (client_id = auth_org_id() AND is_client());
CREATE POLICY "rfq_sched_admin" ON rfq_schedules FOR ALL USING (is_admin());

-- ============================================================
-- REVIEWS
-- ============================================================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_client_own" ON reviews
  FOR ALL USING (client_id = auth_org_id() AND is_client());
CREATE POLICY "reviews_supplier_read" ON reviews
  FOR SELECT USING (
    supplier_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) AND is_supplier()
  );
CREATE POLICY "reviews_admin" ON reviews FOR ALL USING (is_admin());

-- ============================================================
-- AUDIT LOGS (append-only; admins read; system writes)
-- ============================================================
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aal_admin_read" ON admin_audit_log FOR SELECT USING (is_admin());
CREATE POLICY "aal_admin_insert" ON admin_audit_log FOR INSERT WITH CHECK (is_admin());

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "al_admin_read" ON audit_log FOR SELECT USING (is_admin());
-- Inserts happen via SECURITY DEFINER functions only

-- ============================================================
-- DOCUMENT ENGINE
-- ============================================================
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dt_admin" ON document_templates FOR ALL USING (is_admin());
CREATE POLICY "dt_read_all" ON document_templates FOR SELECT USING (TRUE);

ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
-- Parties to the target can read the generated doc
CREATE POLICY "gd_admin" ON generated_documents FOR ALL USING (is_admin());
-- Clients and suppliers read docs linked to their entities via target_id
CREATE POLICY "gd_parties_read" ON generated_documents
  FOR SELECT USING (
    is_client() OR is_supplier()  -- Fine-grained control is enforced at the app layer
  );

-- ============================================================
-- MARGIN SETTINGS (admin only)
-- ============================================================
ALTER TABLE margin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ms_admin" ON margin_settings FOR ALL USING (is_admin());

-- ============================================================
-- SYNC LOGS (admin read-only)
-- ============================================================
ALTER TABLE wafeq_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wafeq_log_admin" ON wafeq_sync_log FOR ALL USING (is_admin());

ALTER TABLE wathq_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wathq_log_admin" ON wathq_sync_log FOR ALL USING (is_admin());

ALTER TABLE spl_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spl_log_admin" ON spl_sync_log FOR ALL USING (is_admin());

-- ============================================================
-- LEADS
-- ============================================================
ALTER TABLE interest_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads_admin" ON interest_submissions FOR ALL USING (is_admin());
-- Public insert (no auth required for lead form)
CREATE POLICY "leads_public_insert" ON interest_submissions
  FOR INSERT WITH CHECK (TRUE);

