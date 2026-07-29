-- Guided setup already stores a routine assignee on every routine step.
-- Allow that assignee to be a pet while retaining the existing pet exclusion
-- for chores.
do $migration$
declare
  function_definition text;
  updated_definition text;
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

  updated_definition := regexp_replace(
    function_definition,
    '(for\s+entry\s+in\s+select\s+value\s+from\s+jsonb_array_elements\(routine_entries\).*?if\s+assignment_index\s*>=\s*0\s+and\s+assignment_index\s*<\s*cardinality\(profile_ids\))\s+and\s+profile_roles\[assignment_index\s*\+\s*1\]\s*<>\s*''pet''\s+then',
    '\1 then'
  );

  if updated_definition = function_definition then
    raise exception 'The pet routine assignment condition was not found';
  end if;

  execute updated_definition;
end
$migration$;
