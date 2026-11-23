-- 009: team board, links, and shoots become one question at a time (no drive section). Run after 008. Safe to run more than once.

-- Team board
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  title text not null,
  notes text not null default '',
  status text not null default 'todo' check (status in ('todo','doing','review','done')),
  assignee text not null default '',
  due date,
  position integer not null default 0,
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tasks_status on tasks(status, position);
alter table tasks enable row level security;
drop trigger if exists tasks_updated_at on tasks;
create trigger tasks_updated_at before update on tasks for each row execute function set_updated_at();

-- Links to Drive folders and anywhere else assets live
create table if not exists links (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  title text not null,
  url text not null,
  category text not null default 'other' check (category in ('raw','edits','brand','docs','other')),
  note text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_links_client on links(client_id, created_at);
alter table links enable row level security;

-- Shoots: the drive prompts become questions he answers one at a time.
update rounds r set config = jsonb_set(
    jsonb_set(r.config, '{cards}',
      coalesce(r.config->'cards', '[]'::jsonb) || (
        select coalesce(jsonb_agg(jsonb_build_object('id', 'q-' || t.ord, 'kind', 'question', 'claim', t.p->>'q', 'why', replace(coalesce(t.p->>'h', ''), ' Tap Next to skip.', ' Skip it if you like.'))), '[]'::jsonb)
        from jsonb_array_elements(coalesce(r.config->'prompts', '[]'::jsonb)) with ordinality as t(p, ord)
      )),
    '{prompts}', '[]'::jsonb)
where r.kind = 'shoot' and jsonb_array_length(coalesce(r.config->'prompts', '[]'::jsonb)) > 0;

-- Jatin's and Akshay's shoot 1: the house sets, keeping any references already added.
update rounds r set config = '{"lede":"A few questions, a photo of a listing, and pick a day. We do the rest.","intro":"The first shoot is about you, not the listings. We want the story of how you got here and the way you actually work, so the first reels feel like a person, not an agency.","cards":[{"id":"the-moment-real-estate","kind":"question","claim":"The moment real estate became serious for you.","why":"One turning point. Then how it still shows up in the way you work."},{"id":"a-deal-or-a","kind":"question","claim":"A deal or a client decision that got difficult.","why":"What was at stake, what you did, what happened. A trade-off, or something you could not control."},{"id":"the-experience-that-changed","kind":"question","claim":"The experience that changed how you take responsibility.","why":"For a client or the team. If working with Ravi is part of it, what you learned and what you do differently now."},{"id":"a-working-day-people","kind":"question","claim":"A working day people rarely see.","why":"A recent one. What happened before or after the inspections, calls or auctions. A moment your judgment mattered."},{"id":"a-client-moment-that","kind":"question","claim":"A client moment that shows what you bring.","why":"A key handover, a hard conversation, a referral. What you did and any feedback you actually got."},{"id":"a-setback-that-changed","kind":"question","claim":"Optional. A setback that changed how you work.","why":"Only the part you are comfortable with, and what changed after. Skip it if you like."},{"id":"an-early-moment-in","kind":"question","claim":"Optional. An early moment in Melbourne that explains who you are today.","why":"Belonging, ambition, finding your place. Leave it out if it feels too personal. Skip it if you like."},{"id":"what-should-stay-private","kind":"question","claim":"What should stay private.","why":"Family, history, opinions, filming situations you do not want. Say background only for anything we should hear but never use."}],"prompts":[],"shootOptions":["Sat 15 Nov","Tue 18 Nov","Sat 22 Nov"],"photoAsks":["A photo of a listing we could film at"],"references":[]}'::jsonb || jsonb_build_object('references', coalesce(r.config->'references', '[]'::jsonb))
from clients c where r.client_id = c.id and c.slug = 'jatin' and r.kind = 'shoot' and r.number = 1;
update rounds r set config = '{"lede":"A few questions, a photo or two, and pick a day. The team does the rest.","intro":"The first shoot is the founder, not the businesses. The store, the desk, the car, the transition. We want it to feel documented, not produced.","cards":[{"id":"the-day-you-decided","kind":"question","claim":"The day you decided to step out of the store.","why":"What you were doing, what you were tired of, what you wanted instead. How it still shows up in how you work."},{"id":"a-decision-at-30","kind":"question","claim":"A decision at 30 Minutes Fix that got hard.","why":"A location, a hire, a bad month. What was at stake, what you did, what happened. Something you could not control."},{"id":"what-most-business-owners","kind":"question","claim":"What most business owners get wrong about branding.","why":"Say it the way you would to a friend over coffee, not to a camera."},{"id":"the-dropshieldz-story-so","kind":"question","claim":"The Dropshieldz story so far.","why":"Why you started it, what is scary about it, where it is up to this week."},{"id":"the-studio-in-your","kind":"question","claim":"The studio, in your words.","why":"Why no name. Who it is for. What you refuse to do."},{"id":"india-dubai-melbourne-one","kind":"question","claim":"Optional. India, Dubai, Melbourne. One moment from the move that explains you.","why":"Belonging, ambition, being new somewhere. Leave it out if it feels too personal. Skip it if you like."},{"id":"what-should-stay-private","kind":"question","claim":"What should stay private.","why":"People, money, history, filming situations you do not want. Say background only for anything we hear but never use."}],"prompts":[],"shootOptions":["Sat 15 Nov","Tue 18 Nov","Sat 22 Nov"],"photoAsks":["A photo from inside one of the stores, any one"],"references":[]}'::jsonb || jsonb_build_object('references', coalesce(r.config->'references', '[]'::jsonb))
from clients c where r.client_id = c.id and c.slug = 'akshay' and r.kind = 'shoot' and r.number = 1;
