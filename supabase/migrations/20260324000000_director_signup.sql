-- Table to store director invite codes.
-- No SELECT policy is created, so users cannot read codes directly.
-- Only SECURITY DEFINER functions can query this table.
create table if not exists public.director_invite_codes (
  code        text        primary key,
  created_at  timestamptz not null default now()
);

-- Default invite code — change this before going to production.
insert into public.director_invite_codes (code)
values ('tisc-director-2026')
on conflict do nothing;

-- Function: claim_director_role
-- Called right after signup. Checks p_code against the invite codes table
-- and upgrades the calling user's profile role to 'director'.
-- SECURITY DEFINER so it can read director_invite_codes despite no SELECT policy.
create or replace function public.claim_director_role(p_code text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not exists (
    select 1 from public.director_invite_codes where code = p_code
  ) then
    raise exception 'invalid_code';
  end if;

  update public.profiles
  set role = 'director'
  where id = auth.uid();

  if not found then
    raise exception 'profile_not_found';
  end if;
end;
$$;
