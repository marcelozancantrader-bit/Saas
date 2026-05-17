-- =============================================
-- Memorial.ai — Signup trigger (Sprint 1)
-- Atomically creates organization + organization_member(owner) on auth.users insert.
-- See ADR-003 for rationale.
-- =============================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_name text;
  v_org_id uuid;
begin
  -- org_name comes from auth.signUp({ options: { data: { org_name } } }).
  -- Fallback: prefix of the e-mail (everything before @).
  v_org_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'org_name'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.organizations (name)
  values (v_org_name)
  returning id into v_org_id;

  insert into public.organization_members (org_id, user_id, role, accepted_at)
  values (v_org_id, new.id, 'owner', now());

  return new;
exception when others then
  -- Surface details in Postgres logs but don't block user creation. Auth flow should
  -- still proceed; an admin can repair org assignment if needed.
  raise warning 'handle_new_user failed for user %: %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
