-- TTK Video Mixer — website layer (marketing site, onboarding quiz, leads, support).
-- Additive only: reuses the exact same Supabase project, auth.users, profiles and
-- entitlements created by 20260907000000_commercial_schema.sql. A user created on
-- the website (email/password or Google) is the SAME account the desktop app logs
-- into — same trial, same entitlement, nothing here duplicates or forks that.

-- ---------------------------------------------------------------------------
-- Fix: handle_new_user() already stored full_name but silently dropped the
-- tiktok_username that both the desktop signup form and the new website
-- signup form send as auth metadata. Re-create the same trigger function
-- with the missing field wired in.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, tiktok_username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'tiktok_username'
  );

  insert into public.entitlements (user_id, plan, status, trial_total, trial_used)
  values (new.id, 'free', 'trial', 27, 0);

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- creator_onboarding — the 7-question gamified quiz shown right after signup.
-- One row per user. Answers are stored as they're picked (so closing the
-- browser mid-quiz resumes where the user left off) and the derived profile
-- is only written once all 7 are answered.
-- ---------------------------------------------------------------------------
create table public.creator_onboarding (
  user_id uuid primary key references auth.users (id) on delete cascade,
  q1 smallint check (q1 between 1 and 6),
  q2 smallint check (q2 between 1 and 6),
  q3 smallint check (q3 between 1 and 6),
  q4 smallint check (q4 between 1 and 6),
  q5 smallint check (q5 between 1 and 6),
  q6 smallint check (q6 between 1 and 6),
  q7 smallint check (q7 between 1 and 6),
  profile_type text check (
    profile_type in (
      'aceleracao',
      'consistente',
      'performance',
      'escala',
      'automatizador',
      'operacao_tiktok_shop'
    )
  ),
  score_volume smallint not null default 0,
  score_consistency smallint not null default 0,
  score_variation smallint not null default 0,
  score_automation smallint not null default 0,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.creator_onboarding enable row level security;

-- Answering your own quiz (even editing a previous answer) is not a
-- security-sensitive mutation the way trial/subscription state is, so plain
-- owner-scoped RLS is enough here — no SECURITY DEFINER RPC needed.
create policy "creator_onboarding_select_own" on public.creator_onboarding
  for select using (auth.uid() = user_id);

create policy "creator_onboarding_insert_own" on public.creator_onboarding
  for insert with check (auth.uid() = user_id);

create policy "creator_onboarding_update_own" on public.creator_onboarding
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger creator_onboarding_set_updated_at
  before update on public.creator_onboarding
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- marketing_leads — visitors who leave an email without creating an account.
-- Insert-only from the client (anon key): nobody should be able to read back
-- other people's emails through the public site.
-- ---------------------------------------------------------------------------
create table public.marketing_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  consent boolean not null default true,
  created_at timestamptz not null default now(),
  unique (email)
);

alter table public.marketing_leads enable row level security;

create policy "marketing_leads_insert_public" on public.marketing_leads
  for insert with check (true);

-- ---------------------------------------------------------------------------
-- support_tickets — the /suporte contact form. user_id is derived server-side
-- from the session (never trusted from the client payload) so nobody can
-- file a ticket that appears to come from someone else's account.
-- ---------------------------------------------------------------------------
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  subject text not null,
  message text not null,
  platform text,
  app_version text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;

create function public.set_support_ticket_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id = auth.uid();
  return new;
end;
$$;

create trigger support_tickets_set_user
  before insert on public.support_tickets
  for each row execute function public.set_support_ticket_user();

create policy "support_tickets_insert_any" on public.support_tickets
  for insert with check (true);

create policy "support_tickets_select_own" on public.support_tickets
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- analytics_events — the site's own lightweight event log (no third-party
-- analytics vendor required). Insert-only from the client; never readable by
-- the anon key, and never carries passwords or video content.
-- ---------------------------------------------------------------------------
create table public.analytics_events (
  id bigint generated always as identity primary key,
  event_name text not null,
  user_id uuid references auth.users (id) on delete set null,
  session_id text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.analytics_events enable row level security;

create function public.set_analytics_event_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id = auth.uid();
  return new;
end;
$$;

create trigger analytics_events_set_user
  before insert on public.analytics_events
  for each row execute function public.set_analytics_event_user();

create policy "analytics_events_insert_any" on public.analytics_events
  for insert with check (true);

create index analytics_events_event_name_idx on public.analytics_events (event_name, created_at desc);
