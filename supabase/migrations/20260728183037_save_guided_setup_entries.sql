create or replace function public.complete_guided_household_setup(
  target_household_id uuid,
  profiles jsonb,
  meal_entries jsonb,
  week_entries jsonb,
  chore_entries jsonb,
  routine_entries jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry jsonb;
  step_value text;
  clean_name text;
  clean_role text;
  clean_emoji text;
  clean_pet_type text;
  new_id uuid;
  member_id uuid;
  profile_ids uuid[] := array[]::uuid[];
  profile_roles text[] := array[]::text[];
  profile_index integer := 0;
  assignment_index integer;
  day_number integer;
  point_value integer;
  step_number integer;
  start_value text;
begin
  if (select auth.uid()) is null or not exists (
    select 1
    from public.household_memberships hm
    where hm.household_id = target_household_id
      and hm.user_id = (select auth.uid())
      and hm.role = 'owner'
  ) then
    raise exception 'Only the household owner can complete setup';
  end if;

  if jsonb_typeof(profiles) <> 'array'
    or jsonb_array_length(profiles) > 20
    or jsonb_typeof(meal_entries) <> 'array'
    or jsonb_array_length(meal_entries) > 30
    or jsonb_typeof(week_entries) <> 'array'
    or jsonb_array_length(week_entries) > 30
    or jsonb_typeof(chore_entries) <> 'array'
    or jsonb_array_length(chore_entries) > 30
    or jsonb_typeof(routine_entries) <> 'array'
    or jsonb_array_length(routine_entries) > 12 then
    raise exception 'There are too many setup entries';
  end if;

  if exists (
    select 1
    from public.app_settings s
    where s.household_id = target_household_id
      and s.key = 'onboarding_completed'
      and s.value = 'true'
  ) then
    raise exception 'This household has already completed setup';
  end if;

  for entry in select value from jsonb_array_elements(profiles)
  loop
    clean_name := btrim(entry ->> 'name');
    clean_role := lower(coalesce(entry ->> 'role', 'child'));
    clean_emoji := coalesce(nullif(btrim(entry ->> 'emoji'), ''), '🙂');
    clean_pet_type := case
      when clean_role = 'pet'
        then lower(coalesce(entry ->> 'petType', 'other'))
      else null
    end;

    if char_length(clean_name) < 1 or char_length(clean_name) > 60 then
      raise exception 'Each family member or pet needs a name';
    end if;
    if clean_role not in ('parent', 'child', 'pet') then
      raise exception 'Profile type must be parent, child or pet';
    end if;
    if clean_role = 'pet'
      and clean_pet_type not in ('dog', 'cat', 'other') then
      raise exception 'Choose dog, cat or other for each pet';
    end if;

    insert into public.family_members (
      household_id, name, role, pet_type, avatar_emoji, display_order
    )
    values (
      target_household_id,
      clean_name,
      clean_role,
      clean_pet_type,
      clean_emoji,
      profile_index
    )
    returning id into new_id;

    profile_ids := array_append(profile_ids, new_id);
    profile_roles := array_append(profile_roles, clean_role);
    profile_index := profile_index + 1;
  end loop;

  for entry in select value from jsonb_array_elements(meal_entries)
  loop
    clean_name := btrim(entry ->> 'title');
    if char_length(clean_name) < 1 or char_length(clean_name) > 120 then
      raise exception 'Each meal needs a name';
    end if;

    insert into public.meals (household_id, title, ingredients)
    values (
      target_household_id,
      clean_name,
      nullif(btrim(entry ->> 'ingredients'), '')
    );
  end loop;

  for entry in select value from jsonb_array_elements(week_entries)
  loop
    clean_name := btrim(entry ->> 'title');
    day_number := (entry ->> 'dayOfWeek')::integer;
    start_value := nullif(btrim(entry ->> 'startTime'), '');

    if char_length(clean_name) < 1 or char_length(clean_name) > 120 then
      raise exception 'Each weekly event needs a name';
    end if;
    if day_number < 1 or day_number > 7 then
      raise exception 'Choose a valid day for each weekly event';
    end if;
    if start_value is not null
      and start_value !~ '^[0-2][0-9]:[0-5][0-9]$' then
      raise exception 'Choose a valid time for each weekly event';
    end if;

    insert into public.weekly_events (
      household_id, title, day_of_week, start_time, active
    )
    values (
      target_household_id,
      clean_name,
      day_number,
      start_value::time,
      true
    );
  end loop;

  for entry in select value from jsonb_array_elements(chore_entries)
  loop
    clean_name := btrim(entry ->> 'title');
    point_value := greatest(1, least(1000, (entry ->> 'points')::integer));
    assignment_index := coalesce((entry ->> 'assigneeIndex')::integer, -1);
    member_id := null;

    if char_length(clean_name) < 1 or char_length(clean_name) > 120 then
      raise exception 'Each chore needs a name';
    end if;
    if lower(entry ->> 'frequency') not in ('daily', 'weekly') then
      raise exception 'Choose daily or weekly for each chore';
    end if;

    if assignment_index >= 0
      and assignment_index < cardinality(profile_ids)
      and profile_roles[assignment_index + 1] <> 'pet' then
      member_id := profile_ids[assignment_index + 1];
    end if;

    insert into public.chores (
      household_id, title, points, frequency, active, shared_completion
    )
    values (
      target_household_id,
      clean_name,
      point_value,
      lower(entry ->> 'frequency'),
      true,
      false
    )
    returning id into new_id;

    if member_id is not null then
      insert into public.chore_assignments (
        household_id, chore_id, family_member_id
      )
      values (target_household_id, new_id, member_id);
    end if;
  end loop;

  for entry in select value from jsonb_array_elements(routine_entries)
  loop
    clean_name := btrim(entry ->> 'title');
    assignment_index := coalesce((entry ->> 'assigneeIndex')::integer, -1);
    member_id := null;

    if char_length(clean_name) < 1 or char_length(clean_name) > 120 then
      raise exception 'Each routine needs a name';
    end if;
    if lower(entry ->> 'timeOfDay') not in (
      'morning', 'afternoon', 'evening'
    ) then
      raise exception 'Choose a valid time of day for each routine';
    end if;

    if assignment_index >= 0
      and assignment_index < cardinality(profile_ids)
      and profile_roles[assignment_index + 1] <> 'pet' then
      member_id := profile_ids[assignment_index + 1];
    end if;

    insert into public.routines (
      household_id, title, time_of_day, active
    )
    values (
      target_household_id,
      clean_name,
      lower(entry ->> 'timeOfDay'),
      true
    )
    returning id into new_id;

    step_number := 1;
    for step_value in
      select value
      from jsonb_array_elements_text(coalesce(entry -> 'steps', '[]'::jsonb))
    loop
      step_value := btrim(step_value);
      if char_length(step_value) > 0 then
        if char_length(step_value) > 120 then
          raise exception 'Routine steps must be 120 characters or fewer';
        end if;

        insert into public.routine_steps (
          household_id, routine_id, title, step_order, assigned_to
        )
        values (
          target_household_id,
          new_id,
          step_value,
          step_number,
          member_id
        );
        step_number := step_number + 1;
      end if;
    end loop;

    if step_number = 1 then
      raise exception 'Each routine needs at least one step';
    end if;
  end loop;

  insert into public.app_settings (household_id, key, value, updated_at)
  values
    (
      target_household_id,
      'setup_meals_now',
      (jsonb_array_length(meal_entries) > 0)::text,
      now()
    ),
    (
      target_household_id,
      'setup_week_now',
      (jsonb_array_length(week_entries) > 0)::text,
      now()
    ),
    (
      target_household_id,
      'setup_chores_now',
      (jsonb_array_length(chore_entries) > 0)::text,
      now()
    ),
    (
      target_household_id,
      'setup_routines_now',
      (jsonb_array_length(routine_entries) > 0)::text,
      now()
    ),
    (target_household_id, 'onboarding_completed', 'true', now())
  on conflict (household_id, key)
  do update set value = excluded.value, updated_at = excluded.updated_at;
end
$$;

revoke all on function public.complete_guided_household_setup(
  uuid, jsonb, jsonb, jsonb, jsonb, jsonb
) from public, anon;
grant execute on function public.complete_guided_household_setup(
  uuid, jsonb, jsonb, jsonb, jsonb, jsonb
) to authenticated;
