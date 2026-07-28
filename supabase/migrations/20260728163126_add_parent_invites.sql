alter table public.household_memberships
  add column email text;

update public.household_memberships hm
set email = lower(u.email)
from auth.users u
where u.id = hm.user_id;

alter table public.household_memberships
  alter column email set not null;

create or replace function private.set_membership_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null then
    select lower(u.email)
    into new.email
    from auth.users u
    where u.id = new.user_id;
  end if;

  if new.email is null then
    raise exception 'A verified email address is required';
  end if;

  return new;
end
$$;

create trigger set_membership_email_before_insert
before insert on public.household_memberships
for each row execute function private.set_membership_email();

revoke all on function private.set_membership_email() from public, anon, authenticated;

create table private.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  code_hash text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index household_invites_household_id_idx
  on private.household_invites(household_id);
create index household_invites_created_by_idx
  on private.household_invites(created_by);
create index household_invites_used_by_idx
  on private.household_invites(used_by);

alter table private.household_invites enable row level security;
revoke all on table private.household_invites from public, anon, authenticated;

create or replace function public.create_parent_invite(
  target_household_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  raw_code text;
begin
  if current_user_id is null
    or not private.is_parent_unlocked(target_household_id) then
    raise exception 'Unlock the Parent Zone before inviting another parent';
  end if;

  delete from private.household_invites
  where household_id = target_household_id
    and used_at is null
    and expires_at <= now();

  raw_code := upper(encode(extensions.gen_random_bytes(9), 'hex'));

  insert into private.household_invites (
    household_id,
    code_hash,
    created_by,
    expires_at
  )
  values (
    target_household_id,
    encode(extensions.digest(raw_code, 'sha256'), 'hex'),
    current_user_id,
    now() + interval '24 hours'
  );

  return substring(raw_code from 1 for 6)
    || '-' || substring(raw_code from 7 for 6)
    || '-' || substring(raw_code from 13 for 6);
end
$$;

create or replace function public.accept_parent_invite(
  invite_code text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  clean_code text := upper(regexp_replace(invite_code, '[^0-9A-F]', '', 'g'));
  invited_household_id uuid;
  current_email text;
begin
  if current_user_id is null then
    raise exception 'You must be signed in';
  end if;

  if exists (
    select 1
    from public.household_memberships hm
    where hm.user_id = current_user_id
  ) then
    raise exception 'This account already belongs to a household';
  end if;

  select lower(u.email)
  into current_email
  from auth.users u
  where u.id = current_user_id;

  if current_email is null then
    raise exception 'A verified email address is required';
  end if;

  select hi.household_id
  into invited_household_id
  from private.household_invites hi
  where hi.code_hash = encode(
      extensions.digest(clean_code, 'sha256'),
      'hex'
    )
    and hi.used_at is null
    and hi.expires_at > now()
  for update;

  if invited_household_id is null then
    raise exception 'That invitation code is invalid or has expired';
  end if;

  insert into public.household_memberships (
    household_id,
    user_id,
    role,
    email
  )
  values (
    invited_household_id,
    current_user_id,
    'parent',
    current_email
  );

  update private.household_invites
  set
    used_by = current_user_id,
    used_at = now()
  where code_hash = encode(
    extensions.digest(clean_code, 'sha256'),
    'hex'
  );

  return invited_household_id;
end
$$;

create or replace function public.remove_parent_access(
  target_household_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
    or not private.is_parent_unlocked(target_household_id) then
    raise exception 'Unlock the Parent Zone before changing access';
  end if;

  if not exists (
    select 1
    from public.household_memberships hm
    where hm.household_id = target_household_id
      and hm.user_id = auth.uid()
      and hm.role = 'owner'
  ) then
    raise exception 'Only the household owner can remove parent access';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'The household owner cannot remove their own access';
  end if;

  delete from public.household_memberships
  where household_id = target_household_id
    and user_id = target_user_id
    and role = 'parent';
end
$$;

revoke all on function public.create_parent_invite(uuid) from public, anon;
revoke all on function public.accept_parent_invite(text) from public, anon;
revoke all on function public.remove_parent_access(uuid, uuid) from public, anon;
grant execute on function public.create_parent_invite(uuid) to authenticated;
grant execute on function public.accept_parent_invite(text) to authenticated;
grant execute on function public.remove_parent_access(uuid, uuid) to authenticated;
