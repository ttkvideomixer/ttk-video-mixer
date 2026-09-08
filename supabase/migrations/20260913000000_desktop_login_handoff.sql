-- Lets a user who is already logged into the website hand that login off to
-- the desktop app (if already installed) via a `videomixer://auth/handoff`
-- deep link, instead of typing an email/password a second time.
--
-- The token itself is the credential (same trust model as a Supabase magic
-- link): random (default gen_random_uuid, 122 bits), single-use (used_at),
-- short-lived (expires_at, ~2 minutes — see create-desktop-handoff). Neither
-- anon nor authenticated gets a policy here on purpose — only the
-- service-role client inside create-desktop-handoff / redeem-desktop-handoff
-- ever touches this table.
create table public.desktop_login_handoffs (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

alter table public.desktop_login_handoffs enable row level security;

create index desktop_login_handoffs_expires_at_idx on public.desktop_login_handoffs (expires_at);
