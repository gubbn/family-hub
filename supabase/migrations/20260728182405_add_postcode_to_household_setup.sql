create or replace function public.set_household_postcode(
  target_household_id uuid,
  home_postcode text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  compact_postcode text := upper(
    regexp_replace(btrim(home_postcode), '[[:space:]]+', '', 'g')
  );
  formatted_postcode text;
begin
  if (select auth.uid()) is null or not exists (
    select 1
    from public.household_memberships hm
    where hm.household_id = target_household_id
      and hm.user_id = (select auth.uid())
      and hm.role = 'owner'
  ) then
    raise exception 'Only the household owner can set the home postcode';
  end if;

  if compact_postcode !~ '^(GIR0AA|[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2})$' then
    raise exception 'Enter a valid UK postcode';
  end if;

  formatted_postcode :=
    substring(
      compact_postcode from 1 for char_length(compact_postcode) - 3
    )
    || ' '
    || right(compact_postcode, 3);

  insert into public.app_settings (
    household_id,
    key,
    value,
    updated_at
  )
  values (
    target_household_id,
    'home_postcode',
    formatted_postcode,
    now()
  )
  on conflict (household_id, key)
  do update set
    value = excluded.value,
    updated_at = excluded.updated_at;
end
$$;

revoke all on function public.set_household_postcode(uuid, text)
from public, anon;
grant execute on function public.set_household_postcode(uuid, text)
to authenticated;
