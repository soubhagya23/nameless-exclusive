-- Rounds: a client goes through several questionnaires over time (handshake, shoot 2 prep, ...).
-- Run in Supabase > SQL Editor after schema.sql. Safe to re-run.

create table if not exists rounds (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  number integer not null default 1,
  title text not null default 'Handshake',
  status text not null default 'draft' check (status in ('draft','live','done')),
  config jsonb not null default '{}'::jsonb,
  shoot_date text,
  shoot_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_rounds_client on rounds(client_id, number desc);
alter table rounds enable row level security;
drop trigger if exists rounds_updated_at on rounds;
create trigger rounds_updated_at before update on rounds for each row execute function set_updated_at();

alter table card_answers add column if not exists round_id uuid references rounds(id) on delete cascade;
alter table recordings add column if not exists round_id uuid references rounds(id) on delete cascade;
alter table clients add column if not exists shoot_days jsonb not null default '[]'::jsonb;

-- The unique key on card answers now includes the round.
alter table card_answers drop constraint if exists card_answers_client_id_card_id_key;
create unique index if not exists card_answers_round_card on card_answers(round_id, card_id);

-- Backfill: every existing client gets round 1 built from its current config, and existing answers move under it.
insert into rounds (client_id, number, title, status, config)
select c.id, 1, 'Handshake', 'live', c.config
from clients c
where not exists (select 1 from rounds r where r.client_id = c.id);

update card_answers a set round_id = r.id from rounds r where a.round_id is null and r.client_id = a.client_id and r.number = 1;
update recordings x set round_id = r.id from rounds r where x.round_id is null and r.client_id = x.client_id and r.number = 1;
