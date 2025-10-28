-- Add order ranking columns for lexicographic commitment ordering
-- This enables stable, offline-safe reordering with O(1) inserts

-- Add order rank columns
alter table commitments
  add column if not exists order_rank text not null default ''::text,
  add column if not exists last_active_rank text null;

-- Add helpful composite index for efficient ordering
-- Groups by user, then by bucket (active/archived/deleted), then by rank
create index if not exists idx_commitments_user_bucket_rank
  on commitments (
    user_id,
    archived,
    (deleted_at is null),
    order_rank asc,
    updated_at asc,
    id asc
  );

-- Add comment for documentation
comment on column commitments.order_rank is 'Lexicographic rank string for stable user-defined ordering';
comment on column commitments.last_active_rank is 'Stored rank before archival, used for restoration';