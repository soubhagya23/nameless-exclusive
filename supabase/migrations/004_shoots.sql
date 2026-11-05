-- Shoots: each round is one shoot's questionnaire + plan. Adds the plan, timestamps and photos.
-- Run in Supabase > SQL Editor. Safe to re-run.

alter table rounds add column if not exists plan jsonb not null default '{}'::jsonb;
alter table rounds add column if not exists plan_status text not null default 'none' check (plan_status in ('none','sent','accepted'));
alter table rounds add column if not exists plan_accepted_at timestamptz;
alter table rounds add column if not exists sent_at timestamptz;
alter table rounds add column if not exists checklist_done jsonb not null default '[]'::jsonb;

-- Photos the client sends from his phone (listing, office, outfit).
create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  round_id uuid references rounds(id) on delete cascade,
  prompt text not null default '',
  storage_path text not null,
  mime text not null default 'image/jpeg',
  created_at timestamptz not null default now()
);
create index if not exists idx_photos_client on photos(client_id, created_at desc);
alter table photos enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 26214400, array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do nothing;

-- Titles: rounds are shoots now.
update rounds set title = 'Shoot ' || number where title in ('Handshake', 'Round') or title like 'Shoot % prep';

-- Jatin back to shoot 1: the handshake is what he should see first.
update rounds r set status = case when r.number = 1 then 'live' else 'draft' end
from clients c where r.client_id = c.id and c.slug = 'jatin';
