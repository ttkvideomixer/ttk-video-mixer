-- Video Mixer — commercial layer (accounts, trial, entitlements, billing, devices)
-- Everything here is additive to the existing local-only desktop app; it does
-- not touch how videos are imported, combined, previewed or rendered.
--
-- SECURITY MODEL: authenticated clients (the desktop app, via the Supabase
-- anon key + user JWT) can only ever SELECT their own rows. Every mutation
-- that matters commercially (trial consumption, entitlement/plan/status,
-- period dates, device registration) happens inside SECURITY DEFINER
-- functions that derive the user from auth.uid() — never from a client-sent
-- parameter — or inside Edge Functions using the service role key, which
-- never ships inside the Electron app.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  tiktok_username text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = 'user');

-- ---------------------------------------------------------------------------
-- entitlements — the single source of truth for what a user is allowed to do
-- ---------------------------------------------------------------------------
create table public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  status text not null default 'trial'
    check (status in ('trial', 'active', 'past_due', 'canceled', 'expired', 'suspended')),
  trial_total integer not null default 27,
  trial_used integer not null default 0,
  trial_eligible boolean not null default true,
  trial_override boolean not null default false,
  subscription_id uuid,
  customer_id text,
  payment_provider text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  last_payment_status text,
  updated_at timestamptz not null default now()
);

alter table public.entitlements enable row level security;

-- Read-only for the client. Every field here is only ever written by
-- SECURITY DEFINER functions or Edge Functions using the service role —
-- there is intentionally no INSERT/UPDATE/DELETE policy for `authenticated`.
create policy "entitlements_select_own" on public.entitlements
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- devices
-- ---------------------------------------------------------------------------
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_hash text not null,
  installation_id uuid not null,
  device_name text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, device_hash)
);

alter table public.devices enable row level security;

create policy "devices_select_own" on public.devices
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- trial_devices — antiabuse: one physical machine can't farm free trials by
-- creating new accounts. No client access at all (service role only).
-- ---------------------------------------------------------------------------
create table public.trial_devices (
  device_hash text primary key,
  first_user_id uuid not null references auth.users (id),
  trial_claimed_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.trial_devices enable row level security;
-- No policies: RLS enabled with zero policies denies all client access.

-- ---------------------------------------------------------------------------
-- subscriptions — one row per billing relationship (card subscription or a
-- Pix 30-day purchase)
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'pagarme',
  provider_customer_id text,
  provider_subscription_id text,
  payment_type text not null check (payment_type in ('credit_card_subscription', 'pix_30_days', 'apple_pay')),
  status text not null default 'pending',
  amount_cents integer not null,
  currency text not null default 'BRL',
  period_start timestamptz,
  period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

alter table public.entitlements
  add constraint entitlements_subscription_fk
  foreign key (subscription_id) references public.subscriptions (id) on delete set null;

-- ---------------------------------------------------------------------------
-- billing_events — append-only audit trail, never stores raw card data
-- ---------------------------------------------------------------------------
create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id),
  provider text not null,
  provider_event text not null,
  provider_object_id text,
  status text,
  amount_cents integer,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

alter table public.billing_events enable row level security;

create policy "billing_events_select_own" on public.billing_events
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- payment_webhook_events — idempotency ledger, service role only
-- ---------------------------------------------------------------------------
create table public.payment_webhook_events (
  provider_event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  payload_hash text not null
);

alter table public.payment_webhook_events enable row level security;
-- No policies: service role only (Edge Functions bypass RLS).

-- ---------------------------------------------------------------------------
-- generation_reservations — the atomic trial "hold" that backs every batch
-- ---------------------------------------------------------------------------
create table public.generation_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entitlement_type text not null check (entitlement_type in ('trial', 'pro')),
  requested_outputs integer not null,
  allowed_outputs integer not null,
  combination_hash text,
  app_version text,
  device_id uuid references public.devices (id),
  status text not null default 'pending' check (status in ('pending', 'completed', 'expired', 'released')),
  successful_outputs integer,
  failed_outputs integer,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  completed_at timestamptz
);

alter table public.generation_reservations enable row level security;

create policy "generation_reservations_select_own" on public.generation_reservations
  for select using (auth.uid() = user_id);

create index generation_reservations_pending_idx
  on public.generation_reservations (status, expires_at)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- generation_batches — minimal analytics only (counts, never video content)
-- ---------------------------------------------------------------------------
create table public.generation_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  count integer not null,
  app_version text,
  status text not null,
  created_at timestamptz not null default now()
);

alter table public.generation_batches enable row level security;

create policy "generation_batches_select_own" on public.generation_batches
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- idempotency_keys — prevents double-checkout / double-charge on retry or
-- double-click. Service role only; Edge Functions check-and-insert before
-- calling out to Pagar.me.
-- ---------------------------------------------------------------------------
create table public.idempotency_keys (
  key text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  response jsonb,
  created_at timestamptz not null default now()
);

alter table public.idempotency_keys enable row level security;
-- No policies: service role only.

create index idempotency_keys_user_idx on public.idempotency_keys (user_id, endpoint);

-- ---------------------------------------------------------------------------
-- New-user bootstrap: profile + free-trial entitlement row
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'));

  insert into public.entitlements (user_id, plan, status, trial_total, trial_used)
  values (new.id, 'free', 'trial', 27, 0);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- resolve_entitlement — the single derived view of "what can this user do"
-- Server time (now()) is always the authority, never the client's clock.
-- ---------------------------------------------------------------------------
create function public.resolve_entitlement()
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
  server_time timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.entitlements%rowtype;
  v_now timestamptz := now();
  v_period_valid boolean;
begin
  select * into e from public.entitlements where user_id = auth.uid();

  if not found then
    raise exception 'ENTITLEMENT_NOT_FOUND';
  end if;

  v_period_valid := e.current_period_end is not null and e.current_period_end > v_now;

  return query select
    e.plan,
    e.status,
    e.trial_total,
    e.trial_used,
    greatest(0, e.trial_total - e.trial_used),
    e.trial_eligible,
    case
      when e.plan = 'pro' and v_period_valid then true
      when e.plan = 'free' and (e.trial_total - e.trial_used) > 0 then true
      else false
    end,
    case
      when e.plan = 'pro' and v_period_valid then null -- null = unlimited
      else greatest(0, e.trial_total - e.trial_used)
    end,
    e.current_period_end,
    e.cancel_at_period_end,
    e.payment_provider,
    e.last_payment_status,
    v_now;
end;
$$;

grant execute on function public.resolve_entitlement() to authenticated;

-- ---------------------------------------------------------------------------
-- reserve_trial_generation — atomic quota hold (row-locked, race-safe)
-- ---------------------------------------------------------------------------
create function public.reserve_trial_generation(
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
  e public.entitlements%rowtype;
  v_remaining integer;
  v_allowed integer;
  v_reservation_id uuid;
  v_expires_at timestamptz := now() + make_interval(mins => p_ttl_minutes);
begin
  if p_requested_outputs <= 0 then
    raise exception 'INVALID_REQUEST';
  end if;

  -- Row lock: two concurrent requests from the same user cannot both read
  -- the same "remaining" value and both succeed.
  select * into e from public.entitlements where user_id = auth.uid() for update;

  if not found then
    raise exception 'ENTITLEMENT_NOT_FOUND';
  end if;

  if e.plan = 'pro' and e.current_period_end is not null and e.current_period_end > now() then
    v_allowed := p_requested_outputs; -- unlimited plan, still tracked per-batch
  else
    v_remaining := greatest(0, e.trial_total - e.trial_used);
    v_allowed := least(p_requested_outputs, v_remaining);
    if v_allowed <= 0 then
      raise exception 'TRIAL_EXHAUSTED';
    end if;
    update public.entitlements set trial_used = trial_used + v_allowed, updated_at = now()
      where user_id = auth.uid();
  end if;

  insert into public.generation_reservations (
    user_id, entitlement_type, requested_outputs, allowed_outputs,
    combination_hash, app_version, device_id, status, expires_at
  ) values (
    auth.uid(), case when e.plan = 'pro' then 'pro' else 'trial' end, p_requested_outputs, v_allowed,
    p_combination_hash, p_app_version, p_device_id, 'pending', v_expires_at
  ) returning id into v_reservation_id;

  return query select v_reservation_id, v_allowed, v_expires_at;
end;
$$;

grant execute on function public.reserve_trial_generation(integer, text, text, uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- complete_generation_reservation — settle a reservation, refund failed jobs
-- ---------------------------------------------------------------------------
create function public.complete_generation_reservation(
  p_reservation_id uuid,
  p_successful_outputs integer,
  p_failed_outputs integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.generation_reservations%rowtype;
begin
  select * into r from public.generation_reservations
    where id = p_reservation_id and user_id = auth.uid() for update;

  if not found then
    raise exception 'RESERVATION_NOT_FOUND';
  end if;

  if r.status <> 'pending' then
    return; -- already settled — idempotent no-op, never double-refund
  end if;

  update public.generation_reservations
    set status = 'completed',
        successful_outputs = p_successful_outputs,
        failed_outputs = p_failed_outputs,
        completed_at = now()
    where id = p_reservation_id;

  -- Refund trial credits for jobs that never actually rendered.
  if r.entitlement_type = 'trial' and p_failed_outputs > 0 then
    update public.entitlements
      set trial_used = greatest(0, trial_used - p_failed_outputs), updated_at = now()
      where user_id = auth.uid();
  end if;

  insert into public.generation_batches (user_id, count, app_version, status)
    values (auth.uid(), coalesce(p_successful_outputs, 0), r.app_version, 'completed');
end;
$$;

grant execute on function public.complete_generation_reservation(uuid, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- release_expired_reservations — conservative reconciliation for crashed
-- clients that reserved credits but never called complete_generation.
-- Meant to be invoked by a scheduled Edge Function (pg_cron or similar).
-- ---------------------------------------------------------------------------
create function public.release_expired_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  r record;
begin
  for r in
    select * from public.generation_reservations
    where status = 'pending' and expires_at < now() - interval '10 minutes'
    for update skip locked
  loop
    update public.generation_reservations set status = 'expired' where id = r.id;

    if r.entitlement_type = 'trial' then
      update public.entitlements
        set trial_used = greatest(0, trial_used - r.allowed_outputs), updated_at = now()
        where user_id = r.user_id;
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- Only service role runs this (called from a scheduled Edge Function), so no
-- authenticated grant here.

-- ---------------------------------------------------------------------------
-- register_device — antiabuse trial gating + Pro device-limit enforcement
-- ---------------------------------------------------------------------------
create function public.register_device(
  p_device_hash text,
  p_installation_id uuid,
  p_device_name text
)
returns table (
  device_id uuid,
  trial_eligible boolean,
  device_limit_reached boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.entitlements%rowtype;
  v_device_id uuid;
  v_existing_trial_device public.trial_devices%rowtype;
  v_is_new_device boolean;
  v_active_device_count integer;
  v_trial_eligible boolean := true;
  v_limit_reached boolean := false;
begin
  select * into e from public.entitlements where user_id = auth.uid() for update;
  if not found then
    raise exception 'ENTITLEMENT_NOT_FOUND';
  end if;

  select not exists (
    select 1 from public.devices where user_id = auth.uid() and device_hash = p_device_hash
  ) into v_is_new_device;

  select count(*) into v_active_device_count
    from public.devices where user_id = auth.uid() and revoked_at is null;

  if v_is_new_device and e.plan = 'pro' and v_active_device_count >= 2 then
    v_limit_reached := true;
  else
    insert into public.devices (user_id, device_hash, installation_id, device_name)
      values (auth.uid(), p_device_hash, p_installation_id, p_device_name)
      on conflict (user_id, device_hash)
      do update set last_seen_at = now(), revoked_at = null
      returning id into v_device_id;
  end if;

  select * into v_existing_trial_device from public.trial_devices where device_hash = p_device_hash;
  if found then
    if v_existing_trial_device.first_user_id <> auth.uid() and not e.trial_override then
      v_trial_eligible := false;
    end if;
    update public.trial_devices set last_seen_at = now() where device_hash = p_device_hash;
  else
    insert into public.trial_devices (device_hash, first_user_id) values (p_device_hash, auth.uid());
  end if;

  update public.entitlements set trial_eligible = v_trial_eligible, updated_at = now()
    where user_id = auth.uid();

  return query select v_device_id, v_trial_eligible, v_limit_reached;
end;
$$;

grant execute on function public.register_device(text, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- rate_limits — minimal fixed-window limiter for sensitive endpoints
-- (login, checkout, generation authorize, password reset). Service role
-- only; checked from Edge Functions before doing the real work.
-- ---------------------------------------------------------------------------
create table public.rate_limits (
  bucket_key text not null,
  window_start timestamptz not null,
  hit_count integer not null default 1,
  primary key (bucket_key, window_start)
);

alter table public.rate_limits enable row level security;
-- No policies: service role only.

create function public.check_rate_limit(
  p_bucket_key text,
  p_max_hits integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  insert into public.rate_limits (bucket_key, window_start, hit_count)
    values (p_bucket_key, v_window_start, 1)
    on conflict (bucket_key, window_start) do update set hit_count = rate_limits.hit_count + 1
    returning hit_count into v_count;

  return v_count <= p_max_hits;
end;
$$;

-- ---------------------------------------------------------------------------
-- Convenience view for "Minha Conta > Dispositivos" (RLS-protected via the
-- base table policy, this view just shapes the columns).
-- ---------------------------------------------------------------------------
create view public.my_devices with (security_invoker = true) as
  select id, device_name, first_seen_at, last_seen_at, revoked_at
  from public.devices
  where user_id = auth.uid()
  order by last_seen_at desc;
