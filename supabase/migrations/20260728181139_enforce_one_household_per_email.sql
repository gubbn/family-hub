begin;

-- Membership email is security-sensitive tenancy data. Always derive it from
-- the authenticated user instead of accepting a caller-supplied value.
create or replace function private.set_membership_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  canonical_email text;
begin
  select lower(btrim(u.email))
  into canonical_email
  from auth.users u
  where u.id = new.user_id
    and u.email_confirmed_at is not null;

  if canonical_email is null or canonical_email = '' then
    raise exception 'A verified email address is required';
  end if;

  -- Serialise attempts for the same email so concurrent joins receive the
  -- friendly error below rather than racing as far as the unique index.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(canonical_email, 0)
  );

  if exists (
    select 1
    from public.household_memberships hm
    where lower(btrim(hm.email)) = canonical_email
      and hm.id <> new.id
  ) then
    raise exception
      'This email address already belongs to a household. Ask the household owner to remove it before joining another.';
  end if;

  new.email := canonical_email;
  return new;
end
$$;

-- Normalise existing rows before enforcing the invariant. This deliberately
-- fails the migration if legacy duplicate emails exist, avoiding an unsafe
-- automatic choice about which household should keep access.
update public.household_memberships hm
set email = lower(btrim(u.email))
from auth.users u
where u.id = hm.user_id
  and u.email_confirmed_at is not null;

create unique index household_memberships_email_key
  on public.household_memberships (lower(btrim(email)));

revoke all on function private.set_membership_email()
  from public, anon, authenticated;

commit;
