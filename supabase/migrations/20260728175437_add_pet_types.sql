alter table public.family_members
  add column pet_type text;

update public.family_members
set pet_type = case
  when avatar_emoji = '🐶' then 'dog'
  when avatar_emoji = '🐱' then 'cat'
  else 'other'
end
where role = 'pet';

alter table public.family_members
  add constraint family_members_pet_type_check
  check (
    (role = 'pet' and pet_type in ('dog', 'cat', 'other'))
    or (role <> 'pet' and pet_type is null)
  );

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
  profile_pet_type text;
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
      profile_pet_type := case
        when profile_role = 'pet' then
          lower(coalesce(profile ->> 'petType', 'other'))
        else null
      end;

      if char_length(profile_name) < 1 or char_length(profile_name) > 60 then
        raise exception 'Each family member or pet needs a name';
      end if;

      if profile_role not in ('parent', 'child', 'pet') then
        raise exception 'Profile type must be parent, child or pet';
      end if;

      if profile_role = 'pet'
        and profile_pet_type not in ('dog', 'cat', 'other') then
        raise exception 'Choose dog, cat or other for each pet';
      end if;

      insert into public.family_members (
        household_id,
        name,
        role,
        pet_type,
        avatar_emoji,
        display_order
      )
      values (
        target_household_id,
        profile_name,
        profile_role,
        profile_pet_type,
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
