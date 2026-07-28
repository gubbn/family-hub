insert into public.app_settings (household_id, key, value, updated_at)
select h.id, 'onboarding_completed', 'true', now()
from public.households h
where exists (
  select 1 from public.family_members fm where fm.household_id = h.id
)
or exists (
  select 1 from public.meals m where m.household_id = h.id
)
or exists (
  select 1 from public.chores c where c.household_id = h.id
)
or exists (
  select 1 from public.routines r where r.household_id = h.id
)
on conflict (household_id, key)
do update set value = excluded.value, updated_at = excluded.updated_at;

create or replace function public.complete_household_onboarding(
  target_household_id uuid,
  profiles jsonb,
  setup_meals_now boolean,
  setup_week_now boolean,
  setup_chores_now boolean,
  setup_routines_now boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile jsonb;
  profile_name text;
  profile_role text;
  profile_emoji text;
  profile_index integer := 0;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.household_memberships hm
    where hm.household_id = target_household_id
      and hm.user_id = auth.uid()
      and hm.role = 'owner'
  ) then
    raise exception 'Only the household owner can complete setup';
  end if;

  if jsonb_typeof(profiles) <> 'array'
    or jsonb_array_length(profiles) > 20 then
    raise exception 'Add no more than 20 family profiles';
  end if;

  if not exists (
    select 1
    from public.app_settings s
    where s.household_id = target_household_id
      and s.key = 'onboarding_completed'
      and s.value = 'true'
  ) then
    for profile in select value from jsonb_array_elements(profiles)
    loop
      profile_name := btrim(profile ->> 'name');
      profile_role := lower(coalesce(profile ->> 'role', 'child'));
      profile_emoji := coalesce(nullif(btrim(profile ->> 'emoji'), ''), '🙂');

      if char_length(profile_name) < 1 or char_length(profile_name) > 60 then
        raise exception 'Each family member or pet needs a name';
      end if;

      if profile_role not in ('parent', 'child', 'pet') then
        raise exception 'Profile type must be parent, child or pet';
      end if;

      insert into public.family_members (
        household_id,
        name,
        role,
        avatar_emoji,
        display_order
      )
      values (
        target_household_id,
        profile_name,
        profile_role,
        profile_emoji,
        profile_index
      );

      profile_index := profile_index + 1;
    end loop;
  end if;

  insert into public.app_settings (household_id, key, value, updated_at)
  values
    (target_household_id, 'setup_meals_now', setup_meals_now::text, now()),
    (target_household_id, 'setup_week_now', setup_week_now::text, now()),
    (target_household_id, 'setup_chores_now', setup_chores_now::text, now()),
    (target_household_id, 'setup_routines_now', setup_routines_now::text, now()),
    (target_household_id, 'onboarding_completed', 'true', now())
  on conflict (household_id, key)
  do update set value = excluded.value, updated_at = excluded.updated_at;
end
$$;

revoke all on function public.complete_household_onboarding(
  uuid,
  jsonb,
  boolean,
  boolean,
  boolean,
  boolean
) from public, anon;
grant execute on function public.complete_household_onboarding(
  uuid,
  jsonb,
  boolean,
  boolean,
  boolean,
  boolean
) to authenticated;
