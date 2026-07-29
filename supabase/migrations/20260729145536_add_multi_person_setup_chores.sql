-- Extend guided setup so one chore can be assigned to several people without
-- creating duplicate chore records. Existing clients that still send a single
-- assigneeIndex remain supported.
do $migration$
declare
  function_definition text;
  updated_definition text;
  previous_definition text;
begin
  select pg_get_functiondef(p.oid)
  into function_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'complete_guided_household_setup';

  if function_definition is null then
    raise exception 'complete_guided_household_setup was not found';
  end if;

  previous_definition := function_definition;
  updated_definition := regexp_replace(
    function_definition,
    'entry\s+jsonb;',
    'entry jsonb; assignee_value jsonb; assignment_indexes jsonb;'
  );

  if updated_definition = previous_definition then
    raise exception 'The setup function declaration was not updated';
  end if;

  previous_definition := updated_definition;
  updated_definition := regexp_replace(
    updated_definition,
    'jsonb_array_length\(week_entries\)\s*>\s*30',
    'jsonb_array_length(week_entries) > 210'
  );

  if updated_definition = previous_definition then
    raise exception 'The weekly event limit was not updated';
  end if;

  previous_definition := updated_definition;
  updated_definition := regexp_replace(
    updated_definition,
    'for\s+entry\s+in\s+select\s+value\s+from\s+jsonb_array_elements\(chore_entries\)\s+loop.*?end\s+loop;\s+for\s+entry\s+in\s+select\s+value\s+from\s+jsonb_array_elements\(routine_entries\)\s+loop',
    $replacement$
for entry in select value from jsonb_array_elements(chore_entries) loop
    clean_name := btrim(entry ->> 'title');
    point_value := greatest(
      1,
      least(1000, (entry ->> 'points')::integer)
    );
    assignment_indexes := coalesce(
      entry -> 'assigneeIndexes',
      jsonb_build_array(
        coalesce((entry ->> 'assigneeIndex')::integer, -1)
      )
    );

    if char_length(clean_name) < 1 or char_length(clean_name) > 120 then
      raise exception 'Each chore needs a name';
    end if;
    if lower(entry ->> 'frequency') not in ('daily', 'weekly') then
      raise exception 'Choose daily or weekly for each chore';
    end if;
    if jsonb_typeof(assignment_indexes) <> 'array'
      or jsonb_array_length(assignment_indexes) > 20 then
      raise exception 'Choose valid family members for each chore';
    end if;

    insert into public.chores (
      household_id,
      title,
      points,
      frequency,
      active,
      shared_completion
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

    for assignee_value in
      select value from jsonb_array_elements(assignment_indexes)
    loop
      if jsonb_typeof(assignee_value) <> 'number' then
        raise exception 'Choose valid family members for each chore';
      end if;

      assignment_index := (assignee_value #>> '{}')::integer;

      if assignment_index >= 0
        and assignment_index < cardinality(profile_ids)
        and profile_roles[assignment_index + 1] <> 'pet' then
        insert into public.chore_assignments (
          household_id,
          chore_id,
          family_member_id
        )
        values (
          target_household_id,
          new_id,
          profile_ids[assignment_index + 1]
        )
        on conflict (chore_id, family_member_id) do nothing;
      end if;
    end loop;
  end loop;

  for entry in select value from jsonb_array_elements(routine_entries) loop
$replacement$
  );

  if updated_definition = previous_definition then
    raise exception 'The chore assignment block was not updated';
  end if;

  execute updated_definition;
end
$migration$;
