-- 010: the Team page. Anyone on this list can sign in to HQ with a magic link; their name shows on the board.
create table if not exists team (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now()
);
alter table team enable row level security;
