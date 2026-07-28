revoke execute on function public.claim_existing_household(text, text) from anon;
revoke execute on function public.create_household(text, text) from anon;
revoke execute on function public.unlock_parent_zone(uuid, text) from anon;
revoke execute on function public.lock_parent_zone(uuid) from anon;
revoke execute on function public.parent_zone_status(uuid) from anon;
revoke execute on function public.change_parent_pin(uuid, text) from anon;

create index parent_unlocks_user_id_idx
  on private.parent_unlocks(user_id);
create index households_created_by_idx
  on public.households(created_by);
create index chores_assigned_to_household_idx
  on public.chores(assigned_to, household_id);
create index chore_assignments_chore_household_idx
  on public.chore_assignments(chore_id, household_id);
create index chore_assignments_member_household_idx
  on public.chore_assignments(family_member_id, household_id);
create index chore_completions_chore_household_idx
  on public.chore_completions(chore_id, household_id);
create index chore_completions_member_household_idx
  on public.chore_completions(completed_by, household_id);
create index completion_streaks_member_household_idx
  on public.completion_streaks(member_id, household_id);
create index meal_plan_meal_household_idx
  on public.meal_plan(meal_id, household_id);
create index meal_ratings_meal_household_idx
  on public.meal_ratings(meal_id, household_id);
create index meal_ratings_member_household_idx
  on public.meal_ratings(family_member_id, household_id);
create index parent_workout_completions_member_household_idx
  on public.parent_workout_completions(family_member_id, household_id);
create index parent_workout_completions_workout_household_idx
  on public.parent_workout_completions(workout_id, household_id);
create index routine_step_completions_member_household_idx
  on public.routine_step_completions(family_member_id, household_id);
create index routine_step_completions_step_household_idx
  on public.routine_step_completions(routine_step_id, household_id);
create index routine_steps_member_household_idx
  on public.routine_steps(assigned_to, household_id);
create index routine_steps_routine_household_idx
  on public.routine_steps(routine_id, household_id);
