create table public.shopping_item_checks (
  household_id uuid not null
    references public.households(id) on delete cascade,
  item_key text not null
    check (char_length(item_key) between 1 and 500),
  completed boolean not null default false,
  updated_at timestamp with time zone not null default now(),
  primary key (household_id, item_key)
);

alter table public.shopping_item_checks enable row level security;

create policy "Household members can view shopping item checks"
on public.shopping_item_checks
for select
to authenticated
using (private.is_household_member(household_id));

create policy "Unlocked parents can add shopping item checks"
on public.shopping_item_checks
for insert
to authenticated
with check (private.is_parent_unlocked(household_id));

create policy "Unlocked parents can update shopping item checks"
on public.shopping_item_checks
for update
to authenticated
using (private.is_parent_unlocked(household_id))
with check (private.is_parent_unlocked(household_id));

create policy "Unlocked parents can delete shopping item checks"
on public.shopping_item_checks
for delete
to authenticated
using (private.is_parent_unlocked(household_id));

grant select, insert, update, delete
on table public.shopping_item_checks
to authenticated;
