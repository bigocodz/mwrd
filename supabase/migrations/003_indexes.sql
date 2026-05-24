-- ============================================================
-- 003_indexes.sql
-- Performance indexes (translating Convex .index() calls)
-- ============================================================

-- profiles
CREATE INDEX idx_profiles_user_id          ON profiles(user_id);
CREATE INDEX idx_profiles_role             ON profiles(role);
CREATE INDEX idx_profiles_public_id        ON profiles(public_id);
CREATE INDEX idx_profiles_parent_client    ON profiles(parent_client_id);
CREATE INDEX idx_profiles_status           ON profiles(status);

-- pending_users
CREATE INDEX idx_pending_users_email       ON pending_users(email);

-- categories
CREATE INDEX idx_categories_parent        ON categories(parent_id);
CREATE INDEX idx_categories_status        ON categories(status);
CREATE INDEX idx_categories_level         ON categories(level);
CREATE INDEX idx_categories_slug          ON categories(slug);

-- master_products
CREATE INDEX idx_master_products_category ON master_products(category_id);
CREATE INDEX idx_master_products_status   ON master_products(status);
CREATE INDEX idx_master_products_sku      ON master_products(sku);

-- products (supplier offers)
CREATE INDEX idx_products_supplier        ON products(supplier_id);
CREATE INDEX idx_products_approval        ON products(approval_status);
CREATE INDEX idx_products_category        ON products(category_id);
CREATE INDEX idx_products_master          ON products(master_product_id);
CREATE INDEX idx_products_master_supplier ON products(master_product_id, supplier_id);

-- bundles
CREATE INDEX idx_bundles_status           ON bundles(status);
CREATE INDEX idx_bundles_category         ON bundles(category_id);
CREATE INDEX idx_bundle_items_bundle      ON bundle_items(bundle_id);
CREATE INDEX idx_bundle_items_master      ON bundle_items(master_product_id);

-- product_addition_requests
CREATE INDEX idx_par_supplier             ON product_addition_requests(supplier_id);
CREATE INDEX idx_par_status               ON product_addition_requests(status);

-- rfqs
CREATE INDEX idx_rfqs_client              ON rfqs(client_id);
CREATE INDEX idx_rfqs_status              ON rfqs(status);

-- rfq_items
CREATE INDEX idx_rfq_items_rfq            ON rfq_items(rfq_id);

-- rfq_supplier_assignments
CREATE INDEX idx_rsa_rfq                  ON rfq_supplier_assignments(rfq_id);
CREATE INDEX idx_rsa_supplier             ON rfq_supplier_assignments(supplier_id);

-- quotes
CREATE INDEX idx_quotes_rfq               ON quotes(rfq_id);
CREATE INDEX idx_quotes_supplier          ON quotes(supplier_id);
CREATE INDEX idx_quotes_status            ON quotes(status);
CREATE INDEX idx_quotes_status_review     ON quotes(status, review_until);

-- quote_items
CREATE INDEX idx_quote_items_quote        ON quote_items(quote_id);

-- quote_revision_events
CREATE INDEX idx_qre_quote                ON quote_revision_events(quote_id);
CREATE INDEX idx_qre_rfq                  ON quote_revision_events(rfq_id);

-- procurement_attachments
CREATE INDEX idx_pa_rfq                   ON procurement_attachments(rfq_id);
CREATE INDEX idx_pa_quote                 ON procurement_attachments(quote_id);

-- client_purchase_orders
CREATE INDEX idx_cpo_client               ON client_purchase_orders(client_id);
CREATE INDEX idx_cpo_rfq                  ON client_purchase_orders(rfq_id);
CREATE INDEX idx_cpo_transaction_ref      ON client_purchase_orders(transaction_ref);

-- orders
CREATE INDEX idx_orders_client            ON orders(client_id);
CREATE INDEX idx_orders_supplier          ON orders(supplier_id);
CREATE INDEX idx_orders_status            ON orders(status);
CREATE INDEX idx_orders_quote             ON orders(quote_id);
CREATE INDEX idx_orders_dispute           ON orders(dispute_status);
CREATE INDEX idx_orders_client_po         ON orders(client_po_id);
CREATE INDEX idx_orders_transaction_ref   ON orders(transaction_ref);

-- order_events
CREATE INDEX idx_order_events_order       ON order_events(order_id);

-- delivery_notes
CREATE INDEX idx_dn_order                 ON delivery_notes(order_id);
CREATE INDEX idx_dn_supplier              ON delivery_notes(supplier_id);
CREATE INDEX idx_dn_client                ON delivery_notes(client_id);
CREATE INDEX idx_dn_status                ON delivery_notes(status);

-- delivery_note_lines
CREATE INDEX idx_dnl_delivery_note        ON delivery_note_lines(delivery_note_id);
CREATE INDEX idx_dnl_order                ON delivery_note_lines(order_id);

-- goods_receipt_notes
CREATE INDEX idx_grn_order                ON goods_receipt_notes(order_id);
CREATE INDEX idx_grn_client               ON goods_receipt_notes(client_id);
CREATE INDEX idx_grn_supplier             ON goods_receipt_notes(supplier_id);
CREATE INDEX idx_grn_status               ON goods_receipt_notes(status);

-- grn_lines
CREATE INDEX idx_grn_lines_grn            ON grn_lines(grn_id);
CREATE INDEX idx_grn_lines_order          ON grn_lines(order_id);

-- payments
CREATE INDEX idx_payments_client          ON payments(client_id);
CREATE INDEX idx_payments_status          ON payments(status);

-- payment_audit_logs
CREATE INDEX idx_pal_payment              ON payment_audit_logs(payment_id);

-- supplier_payouts
CREATE INDEX idx_payouts_supplier         ON supplier_payouts(supplier_id);
CREATE INDEX idx_payouts_status           ON supplier_payouts(status);

-- client_invoices
CREATE INDEX idx_ci_client                ON client_invoices(client_id);
CREATE INDEX idx_ci_status                ON client_invoices(status);
CREATE INDEX idx_ci_order                 ON client_invoices(order_id);
CREATE INDEX idx_ci_zatca_status          ON client_invoices(zatca_status);
CREATE INDEX idx_ci_match_status          ON client_invoices(match_status);

-- payment_allocations
CREATE INDEX idx_pall_payment             ON payment_allocations(payment_id);
CREATE INDEX idx_pall_invoice             ON payment_allocations(invoice_id);

-- client_invoice_adjustments
CREATE INDEX idx_cia_invoice              ON client_invoice_adjustments(invoice_id);
CREATE INDEX idx_cia_client               ON client_invoice_adjustments(client_id);
CREATE INDEX idx_cia_status               ON client_invoice_adjustments(status);

-- supplier_invoices
CREATE INDEX idx_si_supplier              ON supplier_invoices(supplier_id);
CREATE INDEX idx_si_order                 ON supplier_invoices(order_id);
CREATE INDEX idx_si_status                ON supplier_invoices(status);

-- cost_centers / branches / departments
CREATE INDEX idx_cost_centers_client      ON cost_centers(client_id);
CREATE INDEX idx_branches_client          ON branches(client_id);
CREATE INDEX idx_departments_client       ON departments(client_id);

-- approval_rules
CREATE INDEX idx_approval_rules_client    ON approval_rules(client_id);

-- approval_steps
CREATE INDEX idx_approval_steps_rule      ON approval_steps(rule_id);
CREATE INDEX idx_approval_steps_rule_grp  ON approval_steps(rule_id, parallel_group);

-- approval_requests
CREATE INDEX idx_ar_status                ON approval_requests(status);
CREATE INDEX idx_ar_client                ON approval_requests(client_id);
CREATE INDEX idx_ar_quote                 ON approval_requests(quote_id);

-- approval_step_decisions
CREATE INDEX idx_asd_request              ON approval_step_decisions(request_id);
CREATE INDEX idx_asd_status               ON approval_step_decisions(status);
CREATE INDEX idx_asd_approver             ON approval_step_decisions(approver_admin_id, status);

-- contracts
CREATE INDEX idx_contracts_client         ON contracts(client_id);
CREATE INDEX idx_contracts_supplier       ON contracts(supplier_id);
CREATE INDEX idx_contracts_status         ON contracts(status);

-- contract_lines
CREATE INDEX idx_contract_lines_contract  ON contract_lines(contract_id);

-- notifications
CREATE INDEX idx_notifications_user       ON notifications(user_id);
CREATE INDEX idx_notifications_read       ON notifications(user_id, read);

-- notification_channel_prefs
CREATE INDEX idx_ncp_user                 ON notification_channel_prefs(user_id);
CREATE INDEX idx_ncp_user_event           ON notification_channel_prefs(user_id, event_type);

-- notification_dispatch_log
CREATE INDEX idx_ndl_notification         ON notification_dispatch_log(notification_id);
CREATE INDEX idx_ndl_user                 ON notification_dispatch_log(user_id);
CREATE INDEX idx_ndl_status               ON notification_dispatch_log(status);

-- comments
CREATE INDEX idx_comments_target          ON comments(target_type, target_id);
CREATE INDEX idx_comments_author          ON comments(author_profile_id);

-- kyc_documents
CREATE INDEX idx_kyc_profile              ON kyc_documents(profile_id);
CREATE INDEX idx_kyc_status               ON kyc_documents(status);

-- reviews
CREATE INDEX idx_reviews_supplier         ON reviews(supplier_id);
CREATE INDEX idx_reviews_client           ON reviews(client_id);

-- client_catalog_entries
CREATE INDEX idx_cce_client               ON client_catalog_entries(client_id);
CREATE INDEX idx_cce_cart_expires         ON client_catalog_entries(cart_expires_at);

-- rfq_schedules
CREATE INDEX idx_rfq_sched_client         ON rfq_schedules(client_id);
CREATE INDEX idx_rfq_sched_active_next    ON rfq_schedules(active, next_run_at);

-- admin_audit_log
CREATE INDEX idx_aal_admin                ON admin_audit_log(admin_id);

-- audit_log
CREATE INDEX idx_auditlog_actor           ON audit_log(actor_profile_id);
CREATE INDEX idx_auditlog_target          ON audit_log(target_type, target_id);
CREATE INDEX idx_auditlog_action          ON audit_log(action);

-- document_templates
CREATE INDEX idx_doc_templates_key        ON document_templates(key);

-- generated_documents
CREATE INDEX idx_gen_docs_target          ON generated_documents(target_type, target_id);
CREATE INDEX idx_gen_docs_template        ON generated_documents(template_key);

-- wafeq_sync_log
CREATE INDEX idx_wafeq_target             ON wafeq_sync_log(target_type, target_id);
CREATE INDEX idx_wafeq_status             ON wafeq_sync_log(status);
CREATE INDEX idx_wafeq_operation          ON wafeq_sync_log(operation);

-- wathq_sync_log
CREATE INDEX idx_wathq_target             ON wathq_sync_log(target_type, target_id);
CREATE INDEX idx_wathq_status             ON wathq_sync_log(status);

-- spl_sync_log
CREATE INDEX idx_spl_target               ON spl_sync_log(target_type, target_id);
CREATE INDEX idx_spl_status               ON spl_sync_log(status);

-- interest_submissions
CREATE INDEX idx_leads_status             ON interest_submissions(status);

-- margin_settings
CREATE INDEX idx_margins_type             ON margin_settings(type);
