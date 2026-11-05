-- Asks: follow-up questions from HQ that appear on the client's page. He answers by voice or one line.
create table if not exists asks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  question text not null,
  status text not null default 'open' check (status in ('open','answered')),
  answer_text text not null default '',
  recording_id uuid,
  created_at timestamptz not null default now(),
  answered_at timestamptz
);
create index if not exists idx_asks_client on asks(client_id, created_at desc);
alter table asks enable row level security;
