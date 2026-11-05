-- NAMELESS exclusive: database schema
-- Run this once in Supabase > SQL Editor > New query > paste > Run.
-- Safe to re-run: everything is "if not exists".

create extension if not exists "pgcrypto";

-- One row per client. config holds the cards, drive prompts and shoot day options for their page.
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  first_name text not null,
  portrait_url text,
  wa_number text,
  status text not null default 'handshake' check (status in ('handshake','thinking','plan','shoot','running','paused')),
  config jsonb not null default '{}'::jsonb,
  shoot_days jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per card per client. Overwritten on every tap.
create table if not exists card_answers (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  card_id text not null,
  verdict text not null check (verdict in ('yes','no','skip')),
  note text not null default '',
  recording_id uuid,
  updated_at timestamptz not null default now(),
  unique (client_id, card_id)
);

-- Every piece of audio: a "fix" on a card, the "drive", or a v1 "answer".
create table if not exists recordings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  kind text not null check (kind in ('fix','drive','answer')),
  card_id text,
  storage_path text not null,
  mime text not null default 'audio/webm',
  duration_secs integer not null default 0,
  transcript text,
  transcript_status text not null default 'pending' check (transcript_status in ('pending','running','done','failed')),
  transcript_error text,
  created_at timestamptz not null default now()
);

-- Brief drafts written from cards + transcripts. Keep history; the newest is the current one.
create table if not exists briefs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  content text not null,
  model text,
  edited_content text,
  created_at timestamptz not null default now()
);

-- Activity feed for HQ.
create table if not exists events (
  id bigserial primary key,
  client_id uuid not null references clients(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_card_answers_client on card_answers(client_id);
create index if not exists idx_recordings_client on recordings(client_id, created_at desc);
create index if not exists idx_events_client on events(client_id, created_at desc);
create index if not exists idx_briefs_client on briefs(client_id, created_at desc);

-- Row level security: nothing is readable with the anon key. All access goes through the app's server (service role).
alter table clients enable row level security;
alter table card_answers enable row level security;
alter table recordings enable row level security;
alter table briefs enable row level security;
alter table events enable row level security;

-- Storage bucket for audio. Private: files are served through short-lived signed URLs only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recordings', 'recordings', false, 52428800, array['audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav','audio/x-m4a','audio/aac','audio/webm;codecs=opus'])
on conflict (id) do nothing;

-- updated_at helper
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists clients_updated_at on clients;
create trigger clients_updated_at before update on clients for each row execute function set_updated_at();
drop trigger if exists card_answers_updated_at on card_answers;
create trigger card_answers_updated_at before update on card_answers for each row execute function set_updated_at();
