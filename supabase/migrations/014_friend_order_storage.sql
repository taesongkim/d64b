-- Friend order storage for personal reordering
-- Enables users to customize the order of friends shown in Friends' Progress
-- Uses LexoRank pattern identical to commitments for consistency

-- Create friend order table
create table friend_order (
  user_id uuid references auth.users(id) on delete cascade,
  friend_user_id uuid references auth.users(id) on delete cascade,
  group_name text not null default 'all',
  order_rank text not null default '',
  updated_at timestamp with time zone default now(),

  -- Primary key ensures one ordering per friend per group per user
  primary key (user_id, group_name, friend_user_id),

  -- Unique constraint on order_rank within user+group to prevent conflicts
  constraint unique_user_group_rank unique (user_id, group_name, order_rank)
);

-- Add RLS policies
alter table friend_order enable row level security;

-- Users can only see and modify their own friend ordering
create policy "Users can manage their own friend order" on friend_order
  for all using (auth.uid() = user_id);

-- Add composite index for efficient ordered queries
create index idx_friend_order_user_group_rank
  on friend_order (
    user_id,
    group_name,
    order_rank asc,
    updated_at asc
  );

-- Add index for friend lookups
create index idx_friend_order_friend_user
  on friend_order (friend_user_id);

-- Add updated_at trigger
create or replace function update_friend_order_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trigger_update_friend_order_updated_at
  before update on friend_order
  for each row execute function update_friend_order_updated_at();

-- Add helpful comments
comment on table friend_order is 'Personal ordering of friends for each user';
comment on column friend_order.order_rank is 'Lexicographic rank string for stable friend ordering';
comment on column friend_order.group_name is 'Grouping for future friend list categories (always "all" for now)';
comment on column friend_order.updated_at is 'Last modification timestamp for last-write-wins conflict resolution';