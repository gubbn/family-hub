-- These original single-column foreign keys were superseded by household-
-- scoped composite keys when tenancy was introduced. Keeping both makes
-- PostgREST embeds ambiguous (PGRST201 / HTTP 300).
alter table public.chore_assignments
  drop constraint if exists chore_assignments_chore_id_fkey,
  drop constraint if exists chore_assignments_family_member_id_fkey;

alter table public.chore_completions
  drop constraint if exists chore_completions_chore_id_fkey,
  drop constraint if exists chore_completions_completed_by_fkey;

alter table public.chores
  drop constraint if exists chores_assigned_to_fkey;

alter table public.completion_streaks
  drop constraint if exists completion_streaks_member_id_fkey;

alter table public.meal_plan
  drop constraint if exists meal_plan_meal_id_fkey;

alter table public.meal_ratings
  drop constraint if exists meal_ratings_meal_id_fkey,
  drop constraint if exists meal_ratings_family_member_id_fkey;

alter table public.parent_workout_completions
  drop constraint if exists parent_workout_completions_workout_id_fkey,
  drop constraint if exists parent_workout_completions_family_member_id_fkey;

alter table public.routine_step_completions
  drop constraint if exists routine_step_completions_routine_step_id_fkey,
  drop constraint if exists routine_step_completions_family_member_id_fkey;

alter table public.routine_steps
  drop constraint if exists routine_steps_routine_id_fkey,
  drop constraint if exists routine_steps_assigned_to_fkey;

notify pgrst, 'reload schema';
