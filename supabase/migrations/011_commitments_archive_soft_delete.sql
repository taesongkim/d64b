-- Add archive and soft delete functionality to commitments table
alter table commitments add column if not exists archived boolean not null default false;
alter table commitments add column if not exists deleted_at timestamptz null;
create index if not exists idx_commitments_deleted_at on commitments (deleted_at);
create index if not exists idx_commitments_archived on commitments (archived);