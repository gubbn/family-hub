alter table public.chore_completions
  add column points_awarded integer;

update public.chore_completions cc
set points_awarded = greatest(coalesce(c.points, 0), 0)
from public.chores c
where c.id = cc.chore_id;

update public.chore_completions
set points_awarded = 0
where points_awarded is null;

alter table public.chore_completions
  alter column points_awarded set not null,
  add constraint chore_completions_points_awarded_check
    check (points_awarded >= 0);

create or replace function private.set_chore_completion_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select greatest(coalesce(c.points, 0), 0)
  into new.points_awarded
  from public.chores c
  where c.id = new.chore_id
    and c.household_id = new.household_id;

  if new.points_awarded is null then
    raise exception 'The selected chore does not belong to this household';
  end if;

  return new;
end
$$;

create trigger zz_set_chore_completion_points_before_insert
before insert on public.chore_completions
for each row execute function private.set_chore_completion_points();

revoke all on function private.set_chore_completion_points()
from public, anon, authenticated;

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text check (
    description is null or char_length(description) <= 300
  ),
  emoji text not null default '🎁' check (char_length(emoji) <= 16),
  points_cost integer not null check (points_cost > 0 and points_cost <= 100000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id)
);

create table public.reward_requests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  reward_id uuid not null,
  family_member_id uuid not null,
  points_cost integer not null check (points_cost > 0),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined')),
  requested_by uuid not null references auth.users(id) on delete restrict,
  requested_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  constraint reward_requests_reward_household_fkey
    foreign key (reward_id, household_id)
    references public.rewards(id, household_id) on delete restrict,
  constraint reward_requests_member_household_fkey
    foreign key (family_member_id, household_id)
    references public.family_members(id, household_id) on delete restrict
);

create index rewards_household_active_idx
  on public.rewards(household_id, active);
create index reward_requests_household_status_idx
  on public.reward_requests(household_id, status);
create index reward_requests_member_status_idx
  on public.reward_requests(family_member_id, status);
create index reward_requests_reward_household_idx
  on public.reward_requests(reward_id, household_id);
create index reward_requests_member_household_idx
  on public.reward_requests(family_member_id, household_id);
create index reward_requests_requested_by_idx
  on public.reward_requests(requested_by);
create index reward_requests_reviewed_by_idx
  on public.reward_requests(reviewed_by);

alter table public.rewards enable row level security;
alter table public.reward_requests enable row level security;

create policy "Household members can read rewards"
on public.rewards
for select
to authenticated
using (private.is_household_member(household_id));

create policy "Unlocked parents can insert rewards"
on public.rewards
for insert
to authenticated
with check (private.is_parent_unlocked(household_id));

create policy "Unlocked parents can update rewards"
on public.rewards
for update
to authenticated
using (private.is_parent_unlocked(household_id))
with check (private.is_parent_unlocked(household_id));

create policy "Unlocked parents can delete rewards"
on public.rewards
for delete
to authenticated
using (private.is_parent_unlocked(household_id));

create policy "Household members can read reward requests"
on public.reward_requests
for select
to authenticated
using (private.is_household_member(household_id));

revoke all on table public.rewards from anon;
revoke all on table public.reward_requests from anon;
grant select, insert, update, delete on table public.rewards to authenticated;
grant select on table public.reward_requests to authenticated;

create or replace function private.member_points_balance(
  target_household_id uuid,
  target_member_id uuid
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(
    coalesce((
      select sum(cc.points_awarded)
      from public.chore_completions cc
      where cc.household_id = target_household_id
        and cc.completed_by = target_member_id
    ), 0)
    -
    coalesce((
      select sum(rr.points_cost)
      from public.reward_requests rr
      where rr.household_id = target_household_id
        and rr.family_member_id = target_member_id
        and rr.status = 'approved'
    ), 0),
    0
  )::integer
$$;

revoke all on function private.member_points_balance(uuid, uuid)
from public, anon, authenticated;

create or replace function public.request_reward(
  target_reward_id uuid,
  target_family_member_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_household_id uuid;
  reward_cost integer;
  request_id uuid;
begin
  if current_user_id is null then
    raise exception 'You must be signed in';
  end if;

  select r.household_id, r.points_cost
  into target_household_id, reward_cost
  from public.rewards r
  where r.id = target_reward_id
    and r.active = true;

  if target_household_id is null
    or not private.is_household_member(target_household_id) then
    raise exception 'That reward is not available';
  end if;

  if not exists (
    select 1
    from public.family_members fm
    where fm.id = target_family_member_id
      and fm.household_id = target_household_id
      and coalesce(fm.role, 'child') <> 'pet'
  ) then
    raise exception 'Choose a family member from this household';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_family_member_id::text, 0)
  );

  if private.member_points_balance(
    target_household_id,
    target_family_member_id
  ) < reward_cost then
    raise exception 'There are not enough points for this reward yet';
  end if;

  insert into public.reward_requests (
    household_id,
    reward_id,
    family_member_id,
    points_cost,
    requested_by
  )
  values (
    target_household_id,
    target_reward_id,
    target_family_member_id,
    reward_cost,
    current_user_id
  )
  returning id into request_id;

  return request_id;
end
$$;

create or replace function public.review_reward_request(
  target_request_id uuid,
  decision text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  reward_request public.reward_requests%rowtype;
begin
  if current_user_id is null then
    raise exception 'You must be signed in';
  end if;

  if lower(decision) not in ('approved', 'declined') then
    raise exception 'Choose approved or declined';
  end if;

  select *
  into reward_request
  from public.reward_requests rr
  where rr.id = target_request_id
  for update;

  if reward_request.id is null
    or not private.is_parent_unlocked(reward_request.household_id) then
    raise exception 'Unlock the Parent Zone before reviewing rewards';
  end if;

  if reward_request.status <> 'pending' then
    raise exception 'This request has already been reviewed';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(reward_request.family_member_id::text, 0)
  );

  if lower(decision) = 'approved'
    and private.member_points_balance(
      reward_request.household_id,
      reward_request.family_member_id
    ) < reward_request.points_cost then
    raise exception 'There are no longer enough points to approve this reward';
  end if;

  update public.reward_requests
  set
    status = lower(decision),
    reviewed_by = current_user_id,
    reviewed_at = now()
  where id = target_request_id;
end
$$;

revoke all on function public.request_reward(uuid, uuid)
from public, anon;
revoke all on function public.review_reward_request(uuid, text)
from public, anon;
grant execute on function public.request_reward(uuid, uuid)
to authenticated;
grant execute on function public.review_reward_request(uuid, text)
to authenticated;
