-- Fix: is_staff() was plain SQL (invoker rights), so calling it from a
-- policy on public.profiles ("profiles_select_staff") makes it re-query
-- public.profiles, which re-evaluates that same RLS policy, which calls
-- is_staff() again — infinite recursion, surfaced to clients as a bare
-- HTTP 500 on any request that needs profiles' RLS evaluated (including
-- RETURNING rows after an insert/upsert on tables whose own "_select_staff"
-- policy also calls is_staff(), e.g. creator_onboarding).
--
-- SECURITY DEFINER makes the function run as its owner (postgres, which has
-- BYPASSRLS), so the internal profiles lookup skips RLS entirely instead of
-- re-entering it.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) in ('support', 'admin', 'super_admin'),
    false
  );
$$;
