begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  created_by uuid references auth.users(id) on delete set null,
  parent_pin_hash text,
  claim_code_hash text,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.household_memberships (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'parent')),
  created_at timestamptz not null default now(),
  unique (household_id, user_id),
  unique (user_id)
);

create table private.parent_unlocks (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  primary key (household_id, user_id)
);

do $$
declare
  initial_household_id uuid := gen_random_uuid();
begin
  insert into public.households (
    id,
    name,
    claim_code_hash
  )
  values (
    initial_household_id,
    'The Gubb Hubb',
    '$2a$12$/Te6DcvDrttV62kaGLh7Kem0Qw3dpP4wTBPhji4AJ06rGKtnHU.1C'
  );

  alter table public.family_members add column household_id uuid;
  alter table public.chores add column household_id uuid;
  alter table public.chore_completions add column household_id uuid;
  alter table public.routines add column household_id uuid;
  alter table public.routine_steps add column household_id uuid;
  alter table public.chore_assignments add column household_id uuid;
  alter table public.routine_step_completions add column household_id uuid;
  alter table public.meals add column household_id uuid;
  alter table public.activities add column household_id uuid;
  alter table public.weekly_events add column household_id uuid;
  alter table public.meal_plan add column household_id uuid;
  alter table public.meal_ratings add column household_id uuid;
  alter table public.app_settings add column household_id uuid;
  alter table public.shopping_items add column household_id uuid;
  alter table public.completion_streaks add column household_id uuid;
  alter table public.parent_workouts add column household_id uuid;
  alter table public.parent_workout_completions add column household_id uuid;

  update public.family_members set household_id = initial_household_id;
  update public.chores set household_id = initial_household_id;
  update public.chore_completions set household_id = initial_household_id;
  update public.routines set household_id = initial_household_id;
  update public.routine_steps set household_id = initial_household_id;
  update public.chore_assignments set household_id = initial_household_id;
  update public.routine_step_completions set household_id = initial_household_id;
  update public.meals set household_id = initial_household_id;
  update public.activities set household_id = initial_household_id;
  update public.weekly_events set household_id = initial_household_id;
  update public.meal_plan set household_id = initial_household_id;
  update public.meal_ratings set household_id = initial_household_id;
  update public.app_settings set household_id = initial_household_id;
  update public.shopping_items set household_id = initial_household_id;
  update public.completion_streaks set household_id = initial_household_id;
  update public.parent_workouts set household_id = initial_household_id;
  update public.parent_workout_completions set household_id = initial_household_id;
end
$$;

alter table public.family_members alter column household_id set not null;
alter table public.chores alter column household_id set not null;
alter table public.chore_completions alter column household_id set not null;
alter table public.routines alter column household_id set not null;
alter table public.routine_steps alter column household_id set not null;
alter table public.chore_assignments alter column household_id set not null;
alter table public.routine_step_completions alter column household_id set not null;
alter table public.meals alter column household_id set not null;
alter table public.activities alter column household_id set not null;
alter table public.weekly_events alter column household_id set not null;
alter table public.meal_plan alter column household_id set not null;
alter table public.meal_ratings alter column household_id set not null;
alter table public.app_settings alter column household_id set not null;
alter table public.shopping_items alter column household_id set not null;
alter table public.completion_streaks alter column household_id set not null;
alter table public.parent_workouts alter column household_id set not null;
alter table public.parent_workout_completions alter column household_id set not null;

alter table public.family_members
  add constraint family_members_household_id_fkey
  foreign key (household_id) references public.households(id) on delete cascade,
  add constraint family_members_id_household_id_key unique (id, household_id);

alter table public.chores
  add constraint chores_household_id_fkey
  foreign key (household_id) references public.households(id) on delete cascade,
  add constraint chores_id_household_id_key unique (id, household_id),
  add constraint chores_assigned_to_household_fkey
  foreign key (assigned_to, household_id)
  references public.family_members(id, household_id);

alter table public.chore_completions
  add constraint chore_completions_household_id_fkey
  foreign key (household_id) references public.households(id) on delete cascade,
  add constraint chore_completions_chore_household_fkey
  foreign key (chore_id, household_id)
  references public.chores(id, household_id) on delete cascade,
  add constraint chore_completions_member_household_fkey
  foreign key (completed_by, household_id)
  references public.family_members(id, household_id);

alter table public.routines
  add constraint routines_household_id_fkey
  foreign key (household_id) references public.households(id) on delete cascade,
  add constraint routines_id_household_id_key unique (id, household_id);

alter table public.routine_steps
  add constraint routine_steps_household_id_fkey
  foreign key (household_id) references public.households(id) on delete cascade,
  add constraint routine_steps_id_household_id_key unique (id, household_id),
  add constraint routine_steps_routine_household_fkey
  foreign key (routine_id, household_id)
  references public.routines(id, household_id) on delete cascade,
  add constraint routine_steps_member_household_fkey
  foreign key (assigned_to, household_id)
  references public.family_members(id, household_id);

alter table public.chore_assignments
  add constraint chore_assignments_household_id_fkey
  foreign key (household_id) references public.households(id) on delete cascade,
  add constraint chore_assignments_chore_household_fkey
  foreign key (chore_id, household_id)
  references public.chores(id, household_id) on delete cascade,
  add constraint chore_assignments_member_household_fkey
  foreign key (family_member_id, household_id)
  references public.family_members(id, household_id) on delete cascade;

alter table public.routine_step_completions
  add constraint routine_step_completions_household_id_fkey
  foreign key (household_id) references public.households(id) on delete cascade,
  add constraint routine_step_completions_step_household_fkey
  foreign key (routine_step_id, household_id)
  references public.routine_steps(id, household_id) on delete cascade,
  add constraint routine_step_completions_member_household_fkey
  foreign key (family_member_id, household_id)
  references public.family_members(id, household_id) on delete cascade;

alter table public.meals
  add constraint meals_household_id_fkey
  foreign key (household_id) references public.households(id) on delete cascade,
  add constraint meals_id_household_id_key unique (id, household_id);

alter table public.activities
  add constraint activities_household_id_fkey
  foreign key (household_id) references public.households(id) on delete cascade;

alter table public.weekly_events
  add constraint weekly_events_household_id_fkey
  foreign key (household_id) references public.households(id) on delete cascade;

alter table public.meal_plan
  add constraint meal_plan_household_id_fkey
  foreign key (household_id) references public.households(id) on delete cascade,
  add constraint meal_plan_meal_household_fkey
  foreign key (meal_id, household_id)
  references public.meals(id, household_id) on delete cascade;

alter table public.meal_plan drop constraint meal_plan_day_of_week_key;
alter table public.meal_plan
  add constraint meal_plan_household_day_key unique (household_id, day_of_week);

alter table public.meal_ratings
  add constraint meal_ratings_household_id_fkey
  foreign key (household_id) references public.households(id) on delete cascade,
  add constraint meal_ratings_meal_household_fkey
  foreign key (meal_id, household_id)
  references public.meals(id, household_id) on delete cascade,
  add constraint meal_ratings_member_household_fkey
  foreign key (family_member_id, household_id)
  references public.family_members(id, household_id) on delete cascade;

alter table public.app_settings drop constraint app_settings_pkey;
alter table public.app_settings
  add constraint app_settings_household_id_fkey
  foreign key (household_id) references public.households(id) on delete cascade,
  add constraint app_settings_pkey primary key (household_id, key);

delete from public.app_settings where key = 'parent_pin';

alter table public.shopping_items
  add constraint shopping_items_household_id_fkey
  foreign key (household_id) references public.households(id) on delete cascade;

alter table public.completion_streaks
  add constraint completion_streaks_household_id_fkey
  foreign key (household_id) references public.households(id) on delete cascade,
  add constraint completion_streaks_member_household_fkey
  foreign key (member_id, household_id)
  references public.family_members(id, household_id) on delete cascade;

alter table public.parent_workouts
  add constraint parent_workouts_household_id_fkey
  foreign key (household_id) references public.households(id) on delete cascade,
  add constraint parent_workouts_id_household_id_key unique (id, household_id);

alter table public.parent_workout_completions
  add constraint parent_workout_completions_household_id_fkey
  foreign key (household_id) references public.households(id) on delete cascade,
  add constraint parent_workout_completions_workout_household_fkey
  foreign key (workout_id, household_id)
  references public.parent_workouts(id, household_id) on delete cascade,
  add constraint parent_workout_completions_member_household_fkey
  foreign key (family_member_id, household_id)
  references public.family_members(id, household_id) on delete cascade;

create index household_memberships_household_id_idx
  on public.household_memberships(household_id);
create index family_members_household_id_idx
  on public.family_members(household_id);
create index chores_household_id_idx on public.chores(household_id);
create index chores_assigned_to_idx on public.chores(assigned_to);
create index chore_completions_household_id_idx
  on public.chore_completions(household_id);
create index chore_completions_chore_id_idx
  on public.chore_completions(chore_id);
create index chore_completions_completed_by_idx
  on public.chore_completions(completed_by);
create index routines_household_id_idx on public.routines(household_id);
create index routine_steps_household_id_idx
  on public.routine_steps(household_id);
create index routine_steps_routine_id_idx
  on public.routine_steps(routine_id);
create index routine_steps_assigned_to_idx
  on public.routine_steps(assigned_to);
create index chore_assignments_household_id_idx
  on public.chore_assignments(household_id);
create index chore_assignments_family_member_id_idx
  on public.chore_assignments(family_member_id);
create index routine_step_completions_household_id_idx
  on public.routine_step_completions(household_id);
create index routine_step_completions_routine_step_id_idx
  on public.routine_step_completions(routine_step_id);
create index routine_step_completions_family_member_id_idx
  on public.routine_step_completions(family_member_id);
create index meals_household_id_idx on public.meals(household_id);
create index activities_household_id_idx on public.activities(household_id);
create index weekly_events_household_id_idx
  on public.weekly_events(household_id);
create index meal_plan_household_id_idx on public.meal_plan(household_id);
create index meal_plan_meal_id_idx on public.meal_plan(meal_id);
create index meal_ratings_household_id_idx
  on public.meal_ratings(household_id);
create index meal_ratings_family_member_id_idx
  on public.meal_ratings(family_member_id);
create index app_settings_household_id_idx
  on public.app_settings(household_id);
create index shopping_items_household_id_idx
  on public.shopping_items(household_id);
create index completion_streaks_household_id_idx
  on public.completion_streaks(household_id);
create index parent_workouts_household_id_idx
  on public.parent_workouts(household_id);
create index parent_workout_completions_household_id_idx
  on public.parent_workout_completions(household_id);
create index parent_workout_completions_family_member_id_idx
  on public.parent_workout_completions(family_member_id);

create or replace function private.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select hm.household_id
  from public.household_memberships hm
  where hm.user_id = (select auth.uid())
  limit 1
$$;

create or replace function private.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_memberships hm
    where hm.household_id = target_household_id
      and hm.user_id = (select auth.uid())
  )
$$;

create or replace function private.is_household_parent(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_memberships hm
    where hm.household_id = target_household_id
      and hm.user_id = (select auth.uid())
      and hm.role in ('owner', 'parent')
  )
$$;

create or replace function private.is_parent_unlocked(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_household_parent(target_household_id)
    and exists (
      select 1
      from private.parent_unlocks pu
      where pu.household_id = target_household_id
        and pu.user_id = (select auth.uid())
        and pu.expires_at > now()
    )
$$;

create or replace function private.set_household_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.household_id is null then
    new.household_id := private.current_household_id();
  end if;

  if new.household_id is null then
    raise exception 'No household is available for the current user';
  end if;

  return new;
end
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'family_members',
    'chores',
    'chore_completions',
    'routines',
    'routine_steps',
    'chore_assignments',
    'routine_step_completions',
    'meals',
    'activities',
    'weekly_events',
    'meal_plan',
    'meal_ratings',
    'app_settings',
    'shopping_items',
    'completion_streaks',
    'parent_workouts',
    'parent_workout_completions'
  ]
  loop
    execute format(
      'create trigger set_household_id_before_insert before insert on public.%I for each row execute function private.set_household_id()',
      table_name
    );
  end loop;
end
$$;

create or replace function public.claim_existing_household(
  claim_code text,
  parent_pin text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  claimed_household_id uuid;
begin
  if current_user_id is null then
    raise exception 'You must be signed in';
  end if;

  if parent_pin !~ '^[0-9]{4,8}$' then
    raise exception 'The parent PIN must contain 4 to 8 numbers';
  end if;

  if exists (
    select 1
    from public.household_memberships hm
    where hm.user_id = current_user_id
  ) then
    raise exception 'This account already belongs to a household';
  end if;

  select h.id
  into claimed_household_id
  from public.households h
  where h.claimed_at is null
    and h.claim_code_hash is not null
    and extensions.crypt(claim_code, h.claim_code_hash) = h.claim_code_hash
  for update;

  if claimed_household_id is null then
    raise exception 'That household claim code is not valid';
  end if;

  insert into public.household_memberships (
    household_id,
    user_id,
    role
  )
  values (
    claimed_household_id,
    current_user_id,
    'owner'
  );

  update public.households
  set
    created_by = current_user_id,
    parent_pin_hash = extensions.crypt(
      parent_pin,
      extensions.gen_salt('bf', 12)
    ),
    claim_code_hash = null,
    claimed_at = now()
  where id = claimed_household_id;

  return claimed_household_id;
end
$$;

create or replace function public.create_household(
  household_name text,
  parent_pin text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  new_household_id uuid;
  clean_name text := btrim(household_name);
begin
  if current_user_id is null then
    raise exception 'You must be signed in';
  end if;

  if char_length(clean_name) < 2 or char_length(clean_name) > 60 then
    raise exception 'The household name must contain 2 to 60 characters';
  end if;

  if parent_pin !~ '^[0-9]{4,8}$' then
    raise exception 'The parent PIN must contain 4 to 8 numbers';
  end if;

  if exists (
    select 1
    from public.household_memberships hm
    where hm.user_id = current_user_id
  ) then
    raise exception 'This account already belongs to a household';
  end if;

  insert into public.households (
    name,
    created_by,
    parent_pin_hash,
    claimed_at
  )
  values (
    clean_name,
    current_user_id,
    extensions.crypt(parent_pin, extensions.gen_salt('bf', 12)),
    now()
  )
  returning id into new_household_id;

  insert into public.household_memberships (
    household_id,
    user_id,
    role
  )
  values (
    new_household_id,
    current_user_id,
    'owner'
  );

  return new_household_id;
end
$$;

create or replace function public.unlock_parent_zone(
  target_household_id uuid,
  parent_pin text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  stored_hash text;
begin
  if current_user_id is null
    or not private.is_household_parent(target_household_id) then
    return false;
  end if;

  select h.parent_pin_hash
  into stored_hash
  from public.households h
  where h.id = target_household_id;

  if stored_hash is null
    or extensions.crypt(parent_pin, stored_hash) <> stored_hash then
    return false;
  end if;

  insert into private.parent_unlocks (
    household_id,
    user_id,
    expires_at
  )
  values (
    target_household_id,
    current_user_id,
    now() + interval '15 minutes'
  )
  on conflict (household_id, user_id)
  do update set expires_at = excluded.expires_at;

  return true;
end
$$;

create or replace function public.lock_parent_zone(target_household_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from private.parent_unlocks
  where household_id = target_household_id
    and user_id = (select auth.uid())
$$;

create or replace function public.parent_zone_status(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_parent_unlocked(target_household_id)
$$;

create or replace function public.change_parent_pin(
  target_household_id uuid,
  new_parent_pin text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_parent_unlocked(target_household_id) then
    raise exception 'Unlock the Parent Zone before changing the PIN';
  end if;

  if new_parent_pin !~ '^[0-9]{4,8}$' then
    raise exception 'The parent PIN must contain 4 to 8 numbers';
  end if;

  update public.households
  set parent_pin_hash = extensions.crypt(
    new_parent_pin,
    extensions.gen_salt('bf', 12)
  )
  where id = target_household_id;
end
$$;

revoke all on function public.claim_existing_household(text, text) from public;
revoke all on function public.create_household(text, text) from public;
revoke all on function public.unlock_parent_zone(uuid, text) from public;
revoke all on function public.lock_parent_zone(uuid) from public;
revoke all on function public.parent_zone_status(uuid) from public;
revoke all on function public.change_parent_pin(uuid, text) from public;
grant execute on function public.claim_existing_household(text, text) to authenticated;
grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.unlock_parent_zone(uuid, text) to authenticated;
grant execute on function public.lock_parent_zone(uuid) to authenticated;
grant execute on function public.parent_zone_status(uuid) to authenticated;
grant execute on function public.change_parent_pin(uuid, text) to authenticated;

revoke all on function private.current_household_id() from public;
revoke all on function private.is_household_member(uuid) from public;
revoke all on function private.is_household_parent(uuid) from public;
revoke all on function private.is_parent_unlocked(uuid) from public;
revoke all on function private.set_household_id() from public;
grant execute on function private.current_household_id() to authenticated;
grant execute on function private.is_household_member(uuid) to authenticated;
grant execute on function private.is_household_parent(uuid) to authenticated;
grant execute on function private.is_parent_unlocked(uuid) to authenticated;

alter table public.households enable row level security;
alter table public.household_memberships enable row level security;

create policy "Members can view their household"
on public.households
for select
to authenticated
using (private.is_household_member(id));

create policy "Unlocked parents can update their household"
on public.households
for update
to authenticated
using (private.is_parent_unlocked(id))
with check (private.is_parent_unlocked(id));

create policy "Members can view household memberships"
on public.household_memberships
for select
to authenticated
using (private.is_household_member(household_id));

do $$
declare
  table_name text;
  policy_record record;
begin
  foreach table_name in array array[
    'family_members',
    'chores',
    'chore_completions',
    'routines',
    'routine_steps',
    'chore_assignments',
    'routine_step_completions',
    'meals',
    'activities',
    'weekly_events',
    'meal_plan',
    'meal_ratings',
    'app_settings',
    'shopping_items',
    'completion_streaks',
    'parent_workouts',
    'parent_workout_completions'
  ]
  loop
    for policy_record in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = table_name
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        policy_record.policyname,
        table_name
      );
    end loop;

    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (private.is_household_member(household_id))',
      'Household members can read ' || table_name,
      table_name
    );
  end loop;
end
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'family_members',
    'chores',
    'routines',
    'routine_steps',
    'chore_assignments',
    'meals',
    'activities',
    'weekly_events',
    'meal_plan',
    'app_settings',
    'shopping_items',
    'parent_workouts'
  ]
  loop
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (private.is_parent_unlocked(household_id))',
      'Unlocked parents can insert ' || table_name,
      table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (private.is_parent_unlocked(household_id)) with check (private.is_parent_unlocked(household_id))',
      'Unlocked parents can update ' || table_name,
      table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (private.is_parent_unlocked(household_id))',
      'Unlocked parents can delete ' || table_name,
      table_name
    );
  end loop;
end
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'chore_completions',
    'routine_step_completions',
    'meal_ratings',
    'completion_streaks',
    'parent_workout_completions'
  ]
  loop
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (private.is_household_member(household_id))',
      'Household members can insert ' || table_name,
      table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (private.is_household_member(household_id)) with check (private.is_household_member(household_id))',
      'Household members can update ' || table_name,
      table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (private.is_household_member(household_id))',
      'Household members can delete ' || table_name,
      table_name
    );
  end loop;
end
$$;

revoke all on table public.households from anon;
revoke all on table public.household_memberships from anon;
grant select, update on table public.households to authenticated;
grant select on table public.household_memberships to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'family_members',
    'chores',
    'chore_completions',
    'routines',
    'routine_steps',
    'chore_assignments',
    'routine_step_completions',
    'meals',
    'activities',
    'weekly_events',
    'meal_plan',
    'meal_ratings',
    'app_settings',
    'shopping_items',
    'completion_streaks',
    'parent_workouts',
    'parent_workout_completions'
  ]
  loop
    execute format(
      'revoke all on table public.%I from anon',
      table_name
    );
    execute format(
      'grant select, insert, update, delete on table public.%I to authenticated',
      table_name
    );
  end loop;
end
$$;

commit;
