-- ============================================================
-- seed.sql
-- Default reference data for a fresh MWRD Connect deployment.
-- Run automatically by `supabase db reset` (local dev).
-- Run manually on production via: supabase db push --include-seed
--
-- FIRST ADMIN SETUP (run after migrations):
--   1. This seed inserts a pending_users row for the admin email below.
--   2. Go to Supabase Dashboard > Authentication > Users > "Invite user"
--      using that same email. The trigger fires and sets role = 'ADMIN'.
--   3. Or create via CLI:
--      supabase auth admin create-user \
--        --email admin@yourdomain.com \
--        --password 'ChangeMe123!' \
--        --email-confirm
-- ============================================================

-- ============================================================
-- BOOTSTRAP ADMIN
-- Change the email to your real admin address before running.
-- ============================================================

INSERT INTO pending_users (email, role, company_name)
VALUES ('basssam1993@gmail.com', 'ADMIN', 'MWRD Admin')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- DEFAULT GLOBAL MARGIN
-- The auto-quote function falls back to this if no CLIENT or
-- CATEGORY margin is configured.
-- ============================================================

INSERT INTO margin_settings (type, margin_percent)
VALUES ('GLOBAL', 20.00)
ON CONFLICT DO NOTHING;

-- ============================================================
-- CATEGORY TREE
-- 5 top-level categories, each with 2–3 sub-categories.
-- ============================================================

-- Level 0 — top-level
INSERT INTO categories (id, level, slug, name_en, name_ar, is_active, status)
VALUES
  ('00000000-0001-0000-0000-000000000001', 0, 'office-supplies',   'Office Supplies',         'مستلزمات مكتبية',     TRUE, 'ACTIVE'),
  ('00000000-0002-0000-0000-000000000001', 0, 'it-technology',     'IT & Technology',         'تقنية المعلومات',     TRUE, 'ACTIVE'),
  ('00000000-0003-0000-0000-000000000001', 0, 'facilities',        'Facilities & Maintenance','الصيانة والمرافق',    TRUE, 'ACTIVE'),
  ('00000000-0004-0000-0000-000000000001', 0, 'safety-ppe',        'Safety & PPE',            'السلامة والحماية',    TRUE, 'ACTIVE'),
  ('00000000-0005-0000-0000-000000000001', 0, 'food-beverages',    'Food & Beverages',        'الأغذية والمشروبات',  TRUE, 'ACTIVE')
ON CONFLICT DO NOTHING;

-- Level 1 — Office Supplies sub-categories
INSERT INTO categories (id, parent_id, level, slug, name_en, name_ar, is_active, status)
VALUES
  ('00000000-0001-0001-0000-000000000001', '00000000-0001-0000-0000-000000000001', 1, 'stationery',       'Stationery',         'قرطاسية',             TRUE, 'ACTIVE'),
  ('00000000-0001-0002-0000-000000000001', '00000000-0001-0000-0000-000000000001', 1, 'office-furniture', 'Office Furniture',   'أثاث مكتبي',          TRUE, 'ACTIVE'),
  ('00000000-0001-0003-0000-000000000001', '00000000-0001-0000-0000-000000000001', 1, 'printing',         'Printing Supplies',  'مستلزمات الطباعة',    TRUE, 'ACTIVE')
ON CONFLICT DO NOTHING;

-- Level 1 — IT & Technology sub-categories
INSERT INTO categories (id, parent_id, level, slug, name_en, name_ar, is_active, status)
VALUES
  ('00000000-0002-0001-0000-000000000001', '00000000-0002-0000-0000-000000000001', 1, 'computers',        'Computers & Laptops',      'أجهزة الحاسب',       TRUE, 'ACTIVE'),
  ('00000000-0002-0002-0000-000000000001', '00000000-0002-0000-0000-000000000001', 1, 'peripherals',      'Peripherals & Accessories','ملحقات وإكسسوارات',  TRUE, 'ACTIVE'),
  ('00000000-0002-0003-0000-000000000001', '00000000-0002-0000-0000-000000000001', 1, 'networking',       'Networking Equipment',     'معدات الشبكات',      TRUE, 'ACTIVE')
ON CONFLICT DO NOTHING;

-- Level 1 — Facilities sub-categories
INSERT INTO categories (id, parent_id, level, slug, name_en, name_ar, is_active, status)
VALUES
  ('00000000-0003-0001-0000-000000000001', '00000000-0003-0000-0000-000000000001', 1, 'cleaning',         'Cleaning Supplies',  'مواد التنظيف',        TRUE, 'ACTIVE'),
  ('00000000-0003-0002-0000-000000000001', '00000000-0003-0000-0000-000000000001', 1, 'electrical',       'Electrical',         'كهرباء',              TRUE, 'ACTIVE'),
  ('00000000-0003-0003-0000-000000000001', '00000000-0003-0000-0000-000000000001', 1, 'plumbing',         'Plumbing',           'سباكة',               TRUE, 'ACTIVE')
ON CONFLICT DO NOTHING;

-- Level 1 — Safety & PPE sub-categories
INSERT INTO categories (id, parent_id, level, slug, name_en, name_ar, is_active, status)
VALUES
  ('00000000-0004-0001-0000-000000000001', '00000000-0004-0000-0000-000000000001', 1, 'ppe',              'Personal Protective Equipment', 'معدات الحماية الشخصية', TRUE, 'ACTIVE'),
  ('00000000-0004-0002-0000-000000000001', '00000000-0004-0000-0000-000000000001', 1, 'first-aid',        'First Aid',                     'الإسعافات الأولية',     TRUE, 'ACTIVE')
ON CONFLICT DO NOTHING;

-- Level 1 — Food & Beverages sub-categories
INSERT INTO categories (id, parent_id, level, slug, name_en, name_ar, is_active, status)
VALUES
  ('00000000-0005-0001-0000-000000000001', '00000000-0005-0000-0000-000000000001', 1, 'water-beverages',  'Water & Beverages', 'مياه ومشروبات', TRUE, 'ACTIVE'),
  ('00000000-0005-0002-0000-000000000001', '00000000-0005-0000-0000-000000000001', 1, 'pantry',           'Pantry Supplies',   'مؤن المطبخ',    TRUE, 'ACTIVE')
ON CONFLICT DO NOTHING;
