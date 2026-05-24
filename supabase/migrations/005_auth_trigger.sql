-- ============================================================
-- 005_auth_trigger.sql
-- Auto-create a profiles row when a new user signs up.
-- Replicates the createOrUpdateUser callback from convex/auth.ts.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_row   pending_users%ROWTYPE;
  v_role        user_role    := 'CLIENT';
  v_status      profile_status;
  v_kyc_status  kyc_status;
  v_company     TEXT;
  v_count       INTEGER;
  v_prefix      TEXT;
  v_public_id   TEXT;
  v_parent_id   UUID;
  v_team_role   team_role;
  v_full_name   TEXT;
  v_job_title   TEXT;
  v_phone       TEXT;
  v_is_team_member BOOLEAN := FALSE;
BEGIN
  -- Check for pending invite / pre-registration
  SELECT * INTO pending_row
  FROM pending_users
  WHERE email = NEW.email
  LIMIT 1;

  IF FOUND THEN
    v_role      := pending_row.role;
    v_company   := pending_row.company_name;
    v_parent_id := pending_row.parent_client_id;
    v_team_role := pending_row.team_role;
    v_full_name := pending_row.full_name;
    v_job_title := pending_row.job_title;
    v_phone     := pending_row.phone;

    -- Clean up the pending row
    DELETE FROM pending_users WHERE id = pending_row.id;
  ELSE
    -- Normal self-signup: name from raw_user_meta_data
    v_company := NEW.raw_user_meta_data->>'name';
  END IF;

  -- Determine if this is a team-member invite
  v_is_team_member := (v_parent_id IS NOT NULL AND v_role = 'CLIENT');

  -- Status & KYC: auditors and team members activate immediately;
  -- everyone else starts PENDING + INCOMPLETE
  IF v_role = 'AUDITOR' OR v_is_team_member THEN
    v_status     := 'ACTIVE';
    v_kyc_status := 'VERIFIED';
  ELSE
    v_status     := 'PENDING';
    v_kyc_status := 'INCOMPLETE';
  END IF;

  -- Generate a human-readable public_id (e.g. Client-0001)
  SELECT COUNT(*) INTO v_count FROM profiles WHERE role = v_role;
  v_prefix := CASE v_role
    WHEN 'CLIENT'   THEN 'Client'
    WHEN 'SUPPLIER' THEN 'Supplier'
    WHEN 'AUDITOR'  THEN 'Auditor'
    ELSE 'Admin'
  END;
  v_public_id := v_prefix || '-' || LPAD((v_count + 1)::TEXT, 4, '0');

  -- Insert the profile
  INSERT INTO profiles (
    user_id, role, status, kyc_status, company_name, public_id,
    credit_limit, current_balance,
    parent_client_id, team_role,
    full_name, job_title, phone
  ) VALUES (
    NEW.id, v_role, v_status, v_kyc_status,
    v_company, v_public_id, 0, 0,
    CASE WHEN v_is_team_member THEN v_parent_id ELSE NULL END,
    CASE WHEN v_is_team_member THEN COALESCE(v_team_role, 'BUYER') ELSE NULL END,
    v_full_name, v_job_title, v_phone
  );

  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
