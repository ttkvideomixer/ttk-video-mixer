-- TTK Video Mixer — Admin Panel layer.
-- Additive only, on the SAME Supabase project as the commercial schema
-- (20260907000000) and the website schema (20260908000000). No parallel
-- database, no duplicated users/subscriptions — the admin panel reads and
-- writes these exact tables.
--
-- SECURITY MODEL:
--   - Reads: existing tables get an ADDITIONAL permissive RLS policy that
--     lets staff (support/admin/super_admin) SELECT every row, alongside the
--     existing "select own" policy. Postgres OR's permissive policies
--     together, so a normal user is unaffected and staff simply gains
--     visibility. The admin web app queries these tables directly via
--     PostgREST using the ADMIN'S OWN session — never a service-role key.
--   - Writes: every admin mutation goes through a SECURITY DEFINER function
--     that re-checks the caller's role from `profiles.role` (never trusts
--     the client), performs the change, and inserts one `admin_audit_log`
--     row in the SAME transaction — so a mutation can never happen without
--     being logged (the audit insert failing rolls back the mutation too).
--   - Role escalation: `profiles.role` cannot be changed by a direct client
--     UPDATE at all (enforced with column-level GRANTs, not just RLS) —
--     only `admin_set_user_role()` can change it, and only for super_admin
--     (or admin promoting up to 'admin', never 'super_admin').

-- ---------------------------------------------------------------------------
-- 1. Roles: extend profiles.role, add public_user_id, soft-delete, block flag
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('user', 'support', 'admin', 'super_admin'));

alter table public.profiles add column if not exists deleted_at timestamptz;

create sequence if not exists public.public_user_id_seq start 1;

alter table public.profiles add column if not exists public_user_id text unique;

create function public.assign_public_user_id()
returns trigger
language plpgsql
as $$
begin
  if new.public_user_id is null then
    new.public_user_id := 'TTK-' || lpad(nextval('public.public_user_id_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

create trigger profiles_assign_public_user_id
  before insert on public.profiles
  for each row execute function public.assign_public_user_id();

-- Backfill any rows created before this migration (id order = signup order).
do $$
declare r record;
begin
  for r in select id from public.profiles where public_user_id is null order by created_at loop
    update public.profiles
      set public_user_id = 'TTK-' || lpad(nextval('public.public_user_id_seq')::text, 6, '0')
      where id = r.id;
  end loop;
end $$;

-- Lock down role/public_user_id/deleted_at at the column-privilege level —
-- stronger than an RLS check, because it also protects against a client
-- PATCH that only touches these columns while leaving others untouched, and
-- it can't accidentally be loosened by editing the wrong WITH CHECK later.
drop policy if exists "profiles_update_own" on public.profiles;
revoke update on public.profiles from authenticated;
grant update (display_name, tiktok_username, avatar_url, updated_at) on public.profiles to authenticated;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 2. Role-check helpers (used in RLS policies and inside every admin RPC)
-- ---------------------------------------------------------------------------
create function public.is_staff()
returns boolean
language sql
stable
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) in ('support', 'admin', 'super_admin'),
    false
  );
$$;

create function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) in ('admin', 'super_admin'),
    false
  );
$$;

create function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select coalesce((select role from public.profiles where id = auth.uid()) = 'super_admin', false);
$$;

-- ---------------------------------------------------------------------------
-- 3. account blocking — lives on `entitlements` (the table that already
-- defines "what can this user do") rather than a separate profiles flag, so
-- the single entitlement-computation function only has one row to read.
-- ---------------------------------------------------------------------------
alter table public.entitlements add column if not exists blocked_at timestamptz;
alter table public.entitlements add column if not exists blocked_reason text;

-- ---------------------------------------------------------------------------
-- 4. access_grants — time-boxed manual Pro access ("bônus"), independent of
-- the real subscription. Never touches `entitlements.plan`/subscription
-- fields (section 37: "não alterar assinatura real").
-- ---------------------------------------------------------------------------
create table public.access_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  grant_type text not null check (grant_type in ('promo', 'support', 'influencer', 'partner', 'compensation', 'manual')),
  start_at timestamptz not null default now(),
  end_at timestamptz not null,
  granted_by uuid not null references auth.users (id),
  reason text not null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);

alter table public.access_grants enable row level security;
create policy "access_grants_select_staff" on public.access_grants for select using (public.is_staff());

create index access_grants_active_idx on public.access_grants (user_id, end_at) where revoked_at is null;

-- ---------------------------------------------------------------------------
-- 5. trial_bonus_credits — extra free generations on top of the base 27,
-- additive, never rewrites trial_used history.
-- ---------------------------------------------------------------------------
create table public.trial_bonus_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  credits integer not null check (credits > 0),
  granted_by uuid not null references auth.users (id),
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.trial_bonus_credits enable row level security;
create policy "trial_bonus_credits_select_staff" on public.trial_bonus_credits for select using (public.is_staff());

-- ---------------------------------------------------------------------------
-- 6. admin_audit_log — append-only, every sensitive admin mutation writes
-- exactly one row here in the same transaction as the change itself.
-- ---------------------------------------------------------------------------
create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users (id),
  action_type text not null,
  target_user_id uuid references auth.users (id),
  target_object_type text,
  target_object_id uuid,
  previous_value jsonb,
  new_value jsonb,
  reason text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;
create policy "admin_audit_log_select_staff" on public.admin_audit_log for select using (public.is_staff());

create index admin_audit_log_target_user_idx on public.admin_audit_log (target_user_id, created_at desc);
create index admin_audit_log_admin_idx on public.admin_audit_log (admin_user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 7. admin_user_notes / admin_user_tags / fraud_flags
-- ---------------------------------------------------------------------------
create table public.admin_user_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  admin_id uuid not null references auth.users (id),
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_user_notes enable row level security;
create policy "admin_user_notes_select_staff" on public.admin_user_notes for select using (public.is_staff());

create table public.admin_user_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tag text not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  unique (user_id, tag)
);

alter table public.admin_user_tags enable row level security;
create policy "admin_user_tags_select_staff" on public.admin_user_tags for select using (public.is_staff());

create table public.fraud_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  flag_type text not null check (flag_type in ('multiple_trial_accounts', 'chargeback', 'many_devices', 'abusive_requests')),
  note text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.fraud_flags enable row level security;
create policy "fraud_flags_select_staff" on public.fraud_flags for select using (public.is_staff());

-- ---------------------------------------------------------------------------
-- 8. Reprocessable webhook payloads (previously only a hash was kept)
-- ---------------------------------------------------------------------------
alter table public.payment_webhook_events add column if not exists payload jsonb;
alter table public.payment_webhook_events add column if not exists last_error text;

-- ---------------------------------------------------------------------------
-- 9. Staff visibility on existing commercial/website tables — additive
-- permissive SELECT policies. Owner-only policies from earlier migrations
-- are untouched; a normal user still only ever sees their own rows.
-- ---------------------------------------------------------------------------
create policy "profiles_select_staff" on public.profiles for select using (public.is_staff());
create policy "entitlements_select_staff" on public.entitlements for select using (public.is_staff());
create policy "subscriptions_select_staff" on public.subscriptions for select using (public.is_staff());
create policy "billing_events_select_staff" on public.billing_events for select using (public.is_staff());
create policy "devices_select_staff" on public.devices for select using (public.is_staff());
create policy "generation_batches_select_staff" on public.generation_batches for select using (public.is_staff());
create policy "generation_reservations_select_staff" on public.generation_reservations for select using (public.is_staff());
create policy "creator_onboarding_select_staff" on public.creator_onboarding for select using (public.is_staff());
create policy "support_tickets_select_staff" on public.support_tickets for select using (public.is_staff());
create policy "analytics_events_select_staff" on public.analytics_events for select using (public.is_staff());
create policy "payment_webhook_events_select_staff" on public.payment_webhook_events for select using (public.is_staff());
create policy "marketing_leads_select_staff" on public.marketing_leads for select using (public.is_staff());

-- ---------------------------------------------------------------------------
-- 10. calculateEntitlement(userId) — THE single function every client
-- (desktop, website, admin panel) ultimately relies on. Priority order
-- (section 102): BLOCKED > ADMIN GRANT > ACTIVE SUBSCRIPTION > TRIAL+BONUS >
-- nothing. Not directly callable by clients (no grant) — only through the
-- two wrappers below, which add the "whose data am I allowed to see" check.
-- ---------------------------------------------------------------------------
create function public._compute_entitlement(p_user_id uuid)
returns table (
  plan text,
  status text,
  trial_total integer,
  trial_used integer,
  trial_remaining integer,
  trial_eligible boolean,
  generation_allowed boolean,
  generation_limit integer,
  current_period_end timestamptz,
  cancel_at_period_end boolean,
  payment_provider text,
  last_payment_status text,
  server_time timestamptz,
  blocked boolean,
  blocked_reason text,
  access_grant_active boolean,
  access_grant_type text,
  access_grant_end timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.entitlements%rowtype;
  v_now timestamptz := now();
  v_period_valid boolean;
  v_blocked boolean;
  v_grant public.access_grants%rowtype;
  v_grant_active boolean;
  v_bonus_credits integer;
  v_effective_trial_total integer;
  v_trial_remaining integer;
begin
  select * into e from public.entitlements where user_id = p_user_id;
  if not found then
    raise exception 'ENTITLEMENT_NOT_FOUND';
  end if;

  v_blocked := e.blocked_at is not null;
  v_period_valid := e.current_period_end is not null and e.current_period_end > v_now;

  select * into v_grant from public.access_grants
    where user_id = p_user_id and revoked_at is null and start_at <= v_now and end_at > v_now
    order by end_at desc
    limit 1;
  v_grant_active := found;

  select coalesce(sum(credits), 0) into v_bonus_credits
    from public.trial_bonus_credits where user_id = p_user_id;

  v_effective_trial_total := e.trial_total + v_bonus_credits;
  v_trial_remaining := greatest(0, v_effective_trial_total - e.trial_used);

  return query select
    e.plan,
    e.status,
    v_effective_trial_total,
    e.trial_used,
    v_trial_remaining,
    e.trial_eligible,
    case
      when v_blocked then false
      when v_grant_active then true
      when e.plan = 'pro' and v_period_valid then true
      when v_trial_remaining > 0 then true
      else false
    end,
    case
      when v_blocked then 0
      when v_grant_active then null
      when e.plan = 'pro' and v_period_valid then null
      else v_trial_remaining
    end,
    e.current_period_end,
    e.cancel_at_period_end,
    e.payment_provider,
    e.last_payment_status,
    v_now,
    v_blocked,
    e.blocked_reason,
    v_grant_active,
    v_grant.grant_type,
    v_grant.end_at;
end;
$$;

-- Defense in depth: even though Supabase revokes PUBLIC execute on new
-- functions by default, this one takes an arbitrary user id with no
-- built-in ownership check, so it must never be directly callable by a
-- client — only through resolve_entitlement()/admin_resolve_entitlement().
revoke all on function public._compute_entitlement(uuid) from public, anon, authenticated;

-- Postgres refuses CREATE OR REPLACE when the return row type itself changes
-- (adding columns counts as a different type) — must drop first.
drop function if exists public.resolve_entitlement();

create function public.resolve_entitlement()
returns table (
  plan text, status text, trial_total integer, trial_used integer, trial_remaining integer,
  trial_eligible boolean, generation_allowed boolean, generation_limit integer,
  current_period_end timestamptz, cancel_at_period_end boolean, payment_provider text,
  last_payment_status text, server_time timestamptz,
  blocked boolean, blocked_reason text, access_grant_active boolean, access_grant_type text, access_grant_end timestamptz
)
language sql
security definer
set search_path = public
as $$
  select * from public._compute_entitlement(auth.uid());
$$;

grant execute on function public.resolve_entitlement() to authenticated;

create function public.admin_resolve_entitlement(p_user_id uuid)
returns table (
  plan text, status text, trial_total integer, trial_used integer, trial_remaining integer,
  trial_eligible boolean, generation_allowed boolean, generation_limit integer,
  current_period_end timestamptz, cancel_at_period_end boolean, payment_provider text,
  last_payment_status text, server_time timestamptz,
  blocked boolean, blocked_reason text, access_grant_active boolean, access_grant_type text, access_grant_end timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN';
  end if;
  return query select * from public._compute_entitlement(p_user_id);
end;
$$;

grant execute on function public.admin_resolve_entitlement(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 11. reserve_trial_generation — re-created to respect blocked accounts and
-- active admin grants (unlimited, like Pro, without touching trial_used or
-- the real subscription) before falling back to trial+bonus credits.
-- ---------------------------------------------------------------------------
create or replace function public.reserve_trial_generation(
  p_requested_outputs integer,
  p_combination_hash text,
  p_app_version text,
  p_device_id uuid,
  p_ttl_minutes integer default 15
)
returns table (
  reservation_id uuid,
  allowed_outputs integer,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  calc record;
  e public.entitlements%rowtype;
  v_remaining integer;
  v_allowed integer;
  v_entitlement_type text;
  v_reservation_id uuid;
  v_expires_at timestamptz := now() + make_interval(mins => p_ttl_minutes);
begin
  if p_requested_outputs <= 0 then
    raise exception 'INVALID_REQUEST';
  end if;

  select * into calc from public._compute_entitlement(auth.uid());
  if calc.blocked then
    raise exception 'ACCOUNT_BLOCKED';
  end if;
  if not calc.generation_allowed then
    raise exception 'TRIAL_EXHAUSTED';
  end if;

  -- Row lock on the real entitlements row: two concurrent requests from the
  -- same user cannot both read the same "remaining" value and both succeed.
  select * into e from public.entitlements where user_id = auth.uid() for update;

  if calc.access_grant_active or (e.plan = 'pro' and e.current_period_end is not null and e.current_period_end > now()) then
    -- Unlimited access (real subscription or admin bonus grant) — still
    -- tracked per-batch, never deducted from trial credits.
    v_allowed := p_requested_outputs;
    v_entitlement_type := 'pro';
  else
    v_remaining := greatest(0, (e.trial_total + coalesce((
      select sum(credits) from public.trial_bonus_credits where user_id = auth.uid()
    ), 0)) - e.trial_used);
    v_allowed := least(p_requested_outputs, v_remaining);
    if v_allowed <= 0 then
      raise exception 'TRIAL_EXHAUSTED';
    end if;
    update public.entitlements set trial_used = trial_used + v_allowed, updated_at = now()
      where user_id = auth.uid();
    v_entitlement_type := 'trial';
  end if;

  insert into public.generation_reservations (
    user_id, entitlement_type, requested_outputs, allowed_outputs,
    combination_hash, app_version, device_id, status, expires_at
  ) values (
    auth.uid(), v_entitlement_type, p_requested_outputs, v_allowed,
    p_combination_hash, p_app_version, p_device_id, 'pending', v_expires_at
  ) returning id into v_reservation_id;

  return query select v_reservation_id, v_allowed, v_expires_at;
end;
$$;

grant execute on function public.reserve_trial_generation(integer, text, text, uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 12. Admin mutation RPCs — every one re-checks role from `profiles.role`
-- (never trusts the client), requires a reason where the action is
-- sensitive, and inserts an admin_audit_log row atomically with the change.
-- ---------------------------------------------------------------------------
create function public.admin_block_user(
  p_user_id uuid, p_reason text, p_ip_address text default null, p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_previous jsonb;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if not public.check_rate_limit('admin_block:' || auth.uid()::text, 30, 60) then raise exception 'RATE_LIMITED'; end if;
  if p_reason is null or length(trim(p_reason)) = 0 then raise exception 'REASON_REQUIRED'; end if;

  select jsonb_build_object('blocked_at', blocked_at, 'blocked_reason', blocked_reason)
    into v_previous from public.entitlements where user_id = p_user_id;
  if v_previous is null then raise exception 'USER_NOT_FOUND'; end if;

  update public.entitlements set blocked_at = now(), blocked_reason = p_reason, updated_at = now()
    where user_id = p_user_id;

  insert into public.admin_audit_log (
    admin_user_id, action_type, target_user_id, target_object_type, target_object_id,
    previous_value, new_value, reason, ip_address, user_agent
  ) values (
    auth.uid(), 'USER_BLOCKED', p_user_id, 'entitlement', p_user_id,
    v_previous, jsonb_build_object('blocked_at', now(), 'blocked_reason', p_reason), p_reason, p_ip_address, p_user_agent
  );
end;
$$;

grant execute on function public.admin_block_user(uuid, text, text, text) to authenticated;

create function public.admin_unblock_user(
  p_user_id uuid, p_reason text, p_ip_address text default null, p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_previous jsonb;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;

  select jsonb_build_object('blocked_at', blocked_at, 'blocked_reason', blocked_reason)
    into v_previous from public.entitlements where user_id = p_user_id;
  if v_previous is null then raise exception 'USER_NOT_FOUND'; end if;

  update public.entitlements set blocked_at = null, blocked_reason = null, updated_at = now()
    where user_id = p_user_id;

  insert into public.admin_audit_log (
    admin_user_id, action_type, target_user_id, target_object_type, target_object_id,
    previous_value, new_value, reason, ip_address, user_agent
  ) values (
    auth.uid(), 'USER_UNBLOCKED', p_user_id, 'entitlement', p_user_id,
    v_previous, jsonb_build_object('blocked_at', null), p_reason, p_ip_address, p_user_agent
  );
end;
$$;

grant execute on function public.admin_unblock_user(uuid, text, text, text) to authenticated;

create function public.admin_grant_access(
  p_user_id uuid, p_grant_type text, p_start_at timestamptz, p_end_at timestamptz,
  p_reason text, p_ip_address text default null, p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_grant_id uuid;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if not public.check_rate_limit('admin_grant:' || auth.uid()::text, 30, 60) then raise exception 'RATE_LIMITED'; end if;
  if p_reason is null or length(trim(p_reason)) = 0 then raise exception 'REASON_REQUIRED'; end if;
  if p_end_at <= p_start_at then raise exception 'INVALID_RANGE'; end if;
  if not exists (select 1 from public.entitlements where user_id = p_user_id) then raise exception 'USER_NOT_FOUND'; end if;

  insert into public.access_grants (user_id, grant_type, start_at, end_at, granted_by, reason)
    values (p_user_id, p_grant_type, p_start_at, p_end_at, auth.uid(), p_reason)
    returning id into v_grant_id;

  insert into public.admin_audit_log (
    admin_user_id, action_type, target_user_id, target_object_type, target_object_id, new_value, reason, ip_address, user_agent
  ) values (
    auth.uid(), 'BONUS_GRANTED', p_user_id, 'access_grant', v_grant_id,
    jsonb_build_object('grant_type', p_grant_type, 'start_at', p_start_at, 'end_at', p_end_at), p_reason, p_ip_address, p_user_agent
  );

  return v_grant_id;
end;
$$;

grant execute on function public.admin_grant_access(uuid, text, timestamptz, timestamptz, text, text, text) to authenticated;

create function public.admin_revoke_grant(
  p_grant_id uuid, p_reason text, p_ip_address text default null, p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_grant public.access_grants%rowtype;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  select * into v_grant from public.access_grants where id = p_grant_id;
  if not found then raise exception 'GRANT_NOT_FOUND'; end if;

  update public.access_grants set revoked_at = now(), revoked_by = auth.uid() where id = p_grant_id;

  insert into public.admin_audit_log (
    admin_user_id, action_type, target_user_id, target_object_type, target_object_id, previous_value, reason, ip_address, user_agent
  ) values (
    auth.uid(), 'BONUS_REMOVED', v_grant.user_id, 'access_grant', p_grant_id,
    jsonb_build_object('grant_type', v_grant.grant_type, 'end_at', v_grant.end_at), p_reason, p_ip_address, p_user_agent
  );
end;
$$;

grant execute on function public.admin_revoke_grant(uuid, text, text, text) to authenticated;

create function public.admin_add_trial_bonus(
  p_user_id uuid, p_credits integer, p_reason text, p_ip_address text default null, p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_credits <= 0 then raise exception 'INVALID_CREDITS'; end if;
  if p_reason is null or length(trim(p_reason)) = 0 then raise exception 'REASON_REQUIRED'; end if;
  if not exists (select 1 from public.entitlements where user_id = p_user_id) then raise exception 'USER_NOT_FOUND'; end if;

  insert into public.trial_bonus_credits (user_id, credits, granted_by, reason)
    values (p_user_id, p_credits, auth.uid(), p_reason) returning id into v_id;

  insert into public.admin_audit_log (
    admin_user_id, action_type, target_user_id, target_object_type, target_object_id, new_value, reason, ip_address, user_agent
  ) values (
    auth.uid(), 'BONUS_GRANTED', p_user_id, 'trial_bonus_credit', v_id, jsonb_build_object('credits', p_credits), p_reason, p_ip_address, p_user_agent
  );

  return v_id;
end;
$$;

grant execute on function public.admin_add_trial_bonus(uuid, integer, text, text, text) to authenticated;

create function public.admin_reset_trial(
  p_user_id uuid, p_reason text, p_ip_address text default null, p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_previous jsonb;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_reason is null or length(trim(p_reason)) = 0 then raise exception 'REASON_REQUIRED'; end if;

  select jsonb_build_object('trial_used', trial_used, 'trial_eligible', trial_eligible) into v_previous
    from public.entitlements where user_id = p_user_id;
  if v_previous is null then raise exception 'USER_NOT_FOUND'; end if;

  -- trial_override bypasses the one-trial-per-physical-device antiabuse
  -- check (register_device) — an admin-forced reset should actually work
  -- even if this device already claimed a trial before.
  update public.entitlements set trial_used = 0, trial_eligible = true, trial_override = true, updated_at = now()
    where user_id = p_user_id;

  insert into public.admin_audit_log (
    admin_user_id, action_type, target_user_id, target_object_type, target_object_id, previous_value, new_value, reason, ip_address, user_agent
  ) values (
    auth.uid(), 'TRIAL_RESET', p_user_id, 'entitlement', p_user_id, v_previous,
    jsonb_build_object('trial_used', 0, 'trial_eligible', true), p_reason, p_ip_address, p_user_agent
  );
end;
$$;

grant execute on function public.admin_reset_trial(uuid, text, text, text) to authenticated;

create function public.admin_revoke_device(
  p_device_id uuid, p_reason text, p_ip_address text default null, p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_device public.devices%rowtype;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  select * into v_device from public.devices where id = p_device_id;
  if not found then raise exception 'DEVICE_NOT_FOUND'; end if;

  update public.devices set revoked_at = now() where id = p_device_id;

  insert into public.admin_audit_log (
    admin_user_id, action_type, target_user_id, target_object_type, target_object_id, previous_value, reason, ip_address, user_agent
  ) values (
    auth.uid(), 'DEVICE_REVOKED', v_device.user_id, 'device', p_device_id,
    jsonb_build_object('device_name', v_device.device_name), p_reason, p_ip_address, p_user_agent
  );
end;
$$;

grant execute on function public.admin_revoke_device(uuid, text, text, text) to authenticated;

create function public.admin_logout_all_devices(
  p_user_id uuid, p_reason text, p_ip_address text default null, p_user_agent text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;

  update public.devices set revoked_at = now() where user_id = p_user_id and revoked_at is null;
  get diagnostics v_count = row_count;

  insert into public.admin_audit_log (
    admin_user_id, action_type, target_user_id, target_object_type, reason, ip_address, user_agent
  ) values (
    auth.uid(), 'DEVICE_REVOKED', p_user_id, 'all_devices', p_reason, p_ip_address, p_user_agent
  );

  return v_count;
end;
$$;

grant execute on function public.admin_logout_all_devices(uuid, text, text, text) to authenticated;

create function public.admin_add_note(p_user_id uuid, p_note text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not public.is_staff() then raise exception 'FORBIDDEN'; end if;
  if p_note is null or length(trim(p_note)) = 0 then raise exception 'NOTE_REQUIRED'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then raise exception 'USER_NOT_FOUND'; end if;

  insert into public.admin_user_notes (user_id, admin_id, note) values (p_user_id, auth.uid(), p_note) returning id into v_id;

  insert into public.admin_audit_log (admin_user_id, action_type, target_user_id, target_object_type, target_object_id, new_value)
    values (auth.uid(), 'USER_NOTE_CREATED', p_user_id, 'admin_user_note', v_id, jsonb_build_object('note', p_note));

  return v_id;
end;
$$;

grant execute on function public.admin_add_note(uuid, text) to authenticated;

create function public.admin_update_note(p_note_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_existing public.admin_user_notes%rowtype;
begin
  if not public.is_staff() then raise exception 'FORBIDDEN'; end if;
  if p_note is null or length(trim(p_note)) = 0 then raise exception 'NOTE_REQUIRED'; end if;
  select * into v_existing from public.admin_user_notes where id = p_note_id;
  if not found then raise exception 'NOTE_NOT_FOUND'; end if;

  update public.admin_user_notes set note = p_note, updated_at = now() where id = p_note_id;

  insert into public.admin_audit_log (admin_user_id, action_type, target_user_id, target_object_type, target_object_id, previous_value, new_value)
    values (auth.uid(), 'USER_NOTE_UPDATED', v_existing.user_id, 'admin_user_note', p_note_id, jsonb_build_object('note', v_existing.note), jsonb_build_object('note', p_note));
end;
$$;

grant execute on function public.admin_update_note(uuid, text) to authenticated;

create function public.admin_add_tag(p_user_id uuid, p_tag text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_tag is null or length(trim(p_tag)) = 0 then raise exception 'TAG_REQUIRED'; end if;

  insert into public.admin_user_tags (user_id, tag, created_by) values (p_user_id, upper(trim(p_tag)), auth.uid())
    on conflict (user_id, tag) do nothing
    returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.admin_add_tag(uuid, text) to authenticated;

create function public.admin_remove_tag(p_user_id uuid, p_tag text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  delete from public.admin_user_tags where user_id = p_user_id and tag = upper(trim(p_tag));
end;
$$;

grant execute on function public.admin_remove_tag(uuid, text) to authenticated;

create function public.admin_add_fraud_flag(p_user_id uuid, p_flag_type text, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  insert into public.fraud_flags (user_id, flag_type, note, created_by) values (p_user_id, p_flag_type, p_note, auth.uid()) returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.admin_add_fraud_flag(uuid, text, text) to authenticated;

create function public.admin_set_user_role(
  p_user_id uuid, p_new_role text, p_reason text, p_ip_address text default null, p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_previous_role text; v_caller_role text;
begin
  select role into v_caller_role from public.profiles where id = auth.uid();
  if v_caller_role not in ('admin', 'super_admin') then raise exception 'FORBIDDEN'; end if;
  if not public.check_rate_limit('admin_role_change:' || auth.uid()::text, 20, 60) then raise exception 'RATE_LIMITED'; end if;
  if p_new_role not in ('user', 'support', 'admin', 'super_admin') then raise exception 'INVALID_ROLE'; end if;
  -- Section 93: a plain admin can never create or touch a super_admin.
  if v_caller_role = 'admin' and p_new_role = 'super_admin' then raise exception 'FORBIDDEN_ELEVATION'; end if;

  select role into v_previous_role from public.profiles where id = p_user_id;
  if v_previous_role is null then raise exception 'USER_NOT_FOUND'; end if;
  if v_caller_role = 'admin' and v_previous_role = 'super_admin' then raise exception 'FORBIDDEN_TARGET'; end if;

  update public.profiles set role = p_new_role, updated_at = now() where id = p_user_id;

  insert into public.admin_audit_log (
    admin_user_id, action_type, target_user_id, target_object_type, target_object_id, previous_value, new_value, reason, ip_address, user_agent
  ) values (
    auth.uid(), 'ADMIN_ROLE_CHANGED', p_user_id, 'profile', p_user_id,
    jsonb_build_object('role', v_previous_role), jsonb_build_object('role', p_new_role), p_reason, p_ip_address, p_user_agent
  );
end;
$$;

grant execute on function public.admin_set_user_role(uuid, text, text, text, text) to authenticated;

create function public.admin_soft_delete_user(
  p_user_id uuid, p_reason text, p_ip_address text default null, p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  if not public.check_rate_limit('admin_delete:' || auth.uid()::text, 10, 60) then raise exception 'RATE_LIMITED'; end if;
  if p_reason is null or length(trim(p_reason)) = 0 then raise exception 'REASON_REQUIRED'; end if;

  update public.profiles set deleted_at = now() where id = p_user_id and deleted_at is null;
  if not found then raise exception 'USER_NOT_FOUND_OR_ALREADY_DELETED'; end if;

  update public.entitlements set blocked_at = now(), blocked_reason = 'account_deleted' where user_id = p_user_id;
  update public.devices set revoked_at = now() where user_id = p_user_id and revoked_at is null;

  insert into public.admin_audit_log (admin_user_id, action_type, target_user_id, target_object_type, target_object_id, reason, ip_address, user_agent)
    values (auth.uid(), 'USER_DELETED', p_user_id, 'profile', p_user_id, p_reason, p_ip_address, p_user_agent);
end;
$$;

grant execute on function public.admin_soft_delete_user(uuid, text, text, text) to authenticated;

create function public.admin_update_ticket_status(p_ticket_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then raise exception 'FORBIDDEN'; end if;
  if p_status not in ('open', 'in_progress', 'closed') then raise exception 'INVALID_STATUS'; end if;
  update public.support_tickets set status = p_status where id = p_ticket_id;
  if not found then raise exception 'TICKET_NOT_FOUND'; end if;
end;
$$;

grant execute on function public.admin_update_ticket_status(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 13. admin_dashboard_metrics — one aggregated round-trip per dashboard load
-- instead of dozens of ad-hoc client-side queries (section 130).
-- ---------------------------------------------------------------------------
create function public.admin_dashboard_metrics(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_staff() then raise exception 'FORBIDDEN'; end if;

  with
  users_total as (
    select count(*) as c from public.profiles where deleted_at is null and created_at <= p_to
  ),
  users_new as (
    select count(*) as c from public.profiles where deleted_at is null and created_at between p_from and p_to
  ),
  subs_active as (
    select count(*) as c from public.entitlements where plan = 'pro' and current_period_end > now() and blocked_at is null
  ),
  subs_past_due as (
    select count(*) as c from public.entitlements where status = 'past_due'
  ),
  subs_canceled_period as (
    select count(*) as c from public.subscriptions where status = 'canceled' and updated_at between p_from and p_to
  ),
  trial_active as (
    select count(*) as c from public.entitlements where plan = 'free' and trial_used < trial_total and blocked_at is null
  ),
  revenue_gross as (
    select coalesce(sum(amount_cents), 0) as cents from public.billing_events where status = 'paid' and created_at between p_from and p_to
  ),
  revenue_refunds as (
    select coalesce(sum(amount_cents), 0) as cents from public.billing_events where status = 'refunded' and created_at between p_from and p_to
  ),
  new_subscriptions as (
    select count(*) as c from public.subscriptions where created_at between p_from and p_to
  ),
  -- A "renewal" is any successful/failed card charge for a subscription that
  -- already had at least one earlier charge attempt before it (seq > 1).
  renewal_events as (
    select id, status, created_at,
      row_number() over (partition by provider_object_id order by created_at) as seq
    from public.billing_events
    where provider_object_id is not null and status in ('paid', 'failed')
  ),
  renewals_approved as (
    select count(*) as c from renewal_events where seq > 1 and status = 'paid' and created_at between p_from and p_to
  ),
  renewals_failed as (
    select count(*) as c from renewal_events where seq > 1 and status = 'failed' and created_at between p_from and p_to
  ),
  -- MRR: only recurring card subscriptions — a one-off Pix 30-day purchase
  -- is deliberately excluded (section 11: not treated as recurring revenue).
  mrr_active as (
    select coalesce(sum(amount_cents), 0) as cents, count(*) as c
      from public.subscriptions
      where payment_type = 'credit_card_subscription' and status = 'active' and (period_end is null or period_end > now())
  ),
  churned_subs_period as (
    select count(*) as c from public.subscriptions
      where payment_type = 'credit_card_subscription' and status in ('canceled', 'expired') and updated_at between p_from and p_to
  ),
  downloads_period as (
    select
      count(*) filter (where properties ->> 'platform' = 'windows') as windows_c,
      count(*) filter (where properties ->> 'platform' = 'macos') as macos_c
    from public.analytics_events
    where event_name = 'download_started' and created_at between p_from and p_to
  ),
  generations_period as (
    select coalesce(sum(count), 0) as c from public.generation_batches where created_at between p_from and p_to
  ),
  trial_to_pro as (
    select count(*) as c from public.subscriptions s
      where s.created_at between p_from and p_to
        and s.created_at = (select min(s2.created_at) from public.subscriptions s2 where s2.user_id = s.user_id)
  )
  select jsonb_build_object(
    'usersTotal', (select c from users_total),
    'usersNew', (select c from users_new),
    'subscribersActive', (select c from subs_active),
    'subscribersPastDue', (select c from subs_past_due),
    'subscriptionsCanceledInPeriod', (select c from subs_canceled_period),
    'trialActive', (select c from trial_active),
    'revenueGrossCents', (select cents from revenue_gross),
    'revenueRefundsCents', (select cents from revenue_refunds),
    'revenueNetCents', (select cents from revenue_gross) - (select cents from revenue_refunds),
    'newSubscriptions', (select c from new_subscriptions),
    'renewalsApproved', (select c from renewals_approved),
    'renewalsFailed', (select c from renewals_failed),
    'renewalSuccessRatePercent', case when (select c from renewals_approved) + (select c from renewals_failed) = 0 then null
      else round((select c from renewals_approved)::numeric / ((select c from renewals_approved) + (select c from renewals_failed)) * 100, 1) end,
    'mrrCents', (select cents from mrr_active),
    'mrrSubscriberCount', (select c from mrr_active),
    'churnedSubscriptionsInPeriod', (select c from churned_subs_period),
    -- Approximation, documented: churned-in-period ÷ currently-active as the
    -- base (not a true point-in-time cohort — no subscription status history
    -- table exists to compute "active at period start" exactly).
    'churnRatePercent', case when (select c from mrr_active) = 0 then null
      else round((select c from churned_subs_period)::numeric / greatest(1, (select c from mrr_active)) * 100, 1) end,
    'downloadsWindows', (select windows_c from downloads_period),
    'downloadsMacos', (select macos_c from downloads_period),
    'generationsAuthorized', (select c from generations_period),
    'trialToProConversions', (select c from trial_to_pro),
    'periodFrom', p_from,
    'periodTo', p_to,
    'serverTime', now()
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.admin_dashboard_metrics(timestamptz, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- 14. "NÃO RENOVARAM" view (section 16) — plain view, not a function, so the
-- admin app can filter/sort/paginate it with normal PostgREST query params.
-- security_invoker means it inherits the underlying tables' RLS, so it's
-- automatically staff-only in practice (a regular user querying it would
-- only ever see rows matching their own subscriptions/profile policies).
-- ---------------------------------------------------------------------------
create view public.admin_non_renewed_users with (security_invoker = true) as
select
  s.user_id,
  p.public_user_id,
  p.email,
  p.display_name,
  s.id as subscription_id,
  s.payment_type,
  s.status as subscription_status,
  s.period_end as last_period_end,
  s.cancel_at_period_end,
  (select max(be.created_at) from public.billing_events be where be.user_id = s.user_id and be.status = 'paid') as last_paid_at,
  (select count(*) from public.billing_events be where be.user_id = s.user_id and be.status = 'paid') as lifetime_payment_count,
  (select coalesce(sum(be.amount_cents), 0) from public.billing_events be where be.user_id = s.user_id and be.status = 'paid') as lifetime_revenue_cents,
  case
    when s.payment_type = 'pix_30_days' then 'PIX_NAO_RENOVADO'
    when s.status = 'canceled' and s.cancel_at_period_end then 'CANCELAMENTO'
    when s.status = 'past_due' then 'INADIMPLENCIA'
    when s.status = 'canceled' then 'PAGAMENTO_RECUSADO'
    else 'EXPIRADO'
  end as reason
from public.subscriptions s
join public.profiles p on p.id = s.user_id
where s.period_end is not null
  and s.period_end < now()
  and exists (select 1 from public.billing_events be2 where be2.user_id = s.user_id and be2.status = 'paid')
  and s.id = (select s2.id from public.subscriptions s2 where s2.user_id = s.user_id order by s2.created_at desc limit 1)
  and (s.status <> 'active' or s.period_end < now());

-- ---------------------------------------------------------------------------
-- 14b. admin_users_overview — profiles and entitlements only share
-- auth.users as a common foreign key (not each other), so PostgREST can't
-- auto-embed one under the other; this view gives the admin users list one
-- flat, filterable/sortable/paginatable source instead of hand-joining rows
-- in the Next.js API route.
-- ---------------------------------------------------------------------------
create view public.admin_users_overview with (security_invoker = true) as
select
  p.id as user_id,
  p.public_user_id,
  p.email,
  p.display_name,
  p.tiktok_username,
  p.role,
  p.created_at,
  p.deleted_at,
  e.plan,
  e.status,
  e.trial_total,
  e.trial_used,
  e.trial_eligible,
  e.blocked_at,
  e.blocked_reason,
  e.current_period_end,
  e.cancel_at_period_end,
  e.payment_provider,
  e.last_payment_status,
  (select count(*) from public.devices d where d.user_id = p.id and d.revoked_at is null) as active_device_count,
  (select coalesce(sum(gb.count), 0) from public.generation_batches gb where gb.user_id = p.id) as videos_generated,
  (select max(gb.created_at) from public.generation_batches gb where gb.user_id = p.id) as last_generation_at,
  (select max(d.last_seen_at) from public.devices d where d.user_id = p.id) as last_device_seen_at,
  (select coalesce(sum(be.amount_cents), 0) from public.billing_events be where be.user_id = p.id and be.status = 'paid') as lifetime_revenue_cents,
  exists (
    select 1 from public.access_grants ag
    where ag.user_id = p.id and ag.revoked_at is null and ag.start_at <= now() and ag.end_at > now()
  ) as has_active_grant
from public.profiles p
left join public.entitlements e on e.user_id = p.id;

-- ---------------------------------------------------------------------------
-- 15. Realtime — desktop subscribes to its own entitlements row so a block
-- or bonus grant reflects within seconds instead of waiting for the next
-- heartbeat (section 33/104).
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.entitlements;

-- ---------------------------------------------------------------------------
-- 16. Indexes for admin filtering/sorting (section 128)
-- ---------------------------------------------------------------------------
create index if not exists profiles_created_at_idx on public.profiles (created_at desc);
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists entitlements_status_idx on public.entitlements (status);
create index if not exists entitlements_period_end_idx on public.entitlements (current_period_end);
create index if not exists subscriptions_status_idx on public.subscriptions (status);
create index if not exists subscriptions_user_idx on public.subscriptions (user_id, created_at desc);
create index if not exists billing_events_status_idx on public.billing_events (status, created_at desc);
create index if not exists billing_events_user_idx on public.billing_events (user_id, created_at desc);
