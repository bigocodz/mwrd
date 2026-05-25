-- Phase 4: Schedule cron jobs via pg_cron.
-- Requires pg_cron and pg_net extensions (enabled in Supabase Dashboard).
-- Replace 'https://YOUR-PROJECT-REF.supabase.co' with the actual project URL
-- or set it via the supabase_url config variable.

-- Enable required extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Helper: call an Edge Function by job name
create or replace function mwrd_invoke_cron(job_name text)
returns void language plpgsql security definer as $$
declare
  _url text := current_setting('app.supabase_url', true) || '/functions/v1/cron?job=' || job_name;
  _key text := current_setting('app.service_role_key', true);
begin
  perform net.http_post(
    url     := _url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || _key,
      'Content-Type', 'application/json'
    ),
    body    := '{}'::jsonb
  );
end;
$$;

-- Unschedule any pre-existing versions to allow idempotent re-runs
select cron.unschedule('run_rfq_schedules')         where exists (select 1 from cron.job where jobname = 'run_rfq_schedules');
select cron.unschedule('flag_overdue_invoices')      where exists (select 1 from cron.job where jobname = 'flag_overdue_invoices');
select cron.unschedule('wafeq_reconciliation')       where exists (select 1 from cron.job where jobname = 'wafeq_reconciliation');
select cron.unschedule('escalate_stale_approvals')   where exists (select 1 from cron.job where jobname = 'escalate_stale_approvals');
select cron.unschedule('sweep_expired_auto_drafts')  where exists (select 1 from cron.job where jobname = 'sweep_expired_auto_drafts');
select cron.unschedule('expire_stale_carts')         where exists (select 1 from cron.job where jobname = 'expire_stale_carts');

-- hourly: run due recurring RFQ schedules
select cron.schedule(
  'run_rfq_schedules',
  '0 * * * *',
  $$ select mwrd_invoke_cron('run_rfq_schedules') $$
);

-- daily 1am UTC: flag overdue client invoices
select cron.schedule(
  'flag_overdue_invoices',
  '0 1 * * *',
  $$ select mwrd_invoke_cron('flag_overdue_invoices') $$
);

-- daily 2am UTC: Wafeq reconciliation
select cron.schedule(
  'wafeq_reconciliation',
  '0 2 * * *',
  $$ select mwrd_invoke_cron('wafeq_reconciliation') $$
);

-- hourly: escalate stale approval steps
select cron.schedule(
  'escalate_stale_approvals',
  '30 * * * *',
  $$ select mwrd_invoke_cron('escalate_stale_approvals') $$
);

-- every 5 minutes: release expired auto-quote drafts
select cron.schedule(
  'sweep_expired_auto_drafts',
  '*/5 * * * *',
  $$ select mwrd_invoke_cron('sweep_expired_auto_drafts') $$
);

-- hourly: expire stale cart entries (7-day TTL)
select cron.schedule(
  'expire_stale_carts',
  '45 * * * *',
  $$ select mwrd_invoke_cron('expire_stale_carts') $$
);
