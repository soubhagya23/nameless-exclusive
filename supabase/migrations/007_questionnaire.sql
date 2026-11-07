-- 007: the onboarding questionnaire becomes its own round (kind 'questionnaire', number 0), sent once when a client is onboarded.
-- Shoots are rounds of kind 'shoot' (1, 2, 3) with the drive, questions, content references and the plan.
-- Safe to run more than once.

alter table rounds add column if not exists kind text not null default 'shoot' check (kind in ('questionnaire','shoot'));
create index if not exists idx_rounds_client_kind on rounds(client_id, kind);

-- Every client whose shoot 1 still carries the cards: split the cards off into a questionnaire round.
insert into rounds (client_id, kind, number, title, status, config, sent_at)
select r.client_id, 'questionnaire', 0, 'Questionnaire', r.status,
  jsonb_build_object(
    'lede', coalesce(r.config->'lede', '""'::jsonb),
    'intro', coalesce(r.config->'intro', '""'::jsonb),
    'cards', coalesce(r.config->'cards', '[]'::jsonb),
    'prompts', '[]'::jsonb,
    'shootOptions', '[]'::jsonb,
    'photoAsks', '[]'::jsonb
  ),
  r.sent_at
from rounds r
where r.kind = 'shoot' and r.number = 1 and jsonb_array_length(coalesce(r.config->'cards', '[]'::jsonb)) > 0
  and not exists (select 1 from rounds q where q.client_id = r.client_id and q.kind = 'questionnaire');

-- His card answers and card voice notes move with the cards.
update card_answers a set round_id = q.id
from rounds r join rounds q on q.client_id = r.client_id and q.kind = 'questionnaire'
where a.round_id = r.id and r.kind = 'shoot' and r.number = 1;

update recordings x set round_id = q.id
from rounds r join rounds q on q.client_id = r.client_id and q.kind = 'questionnaire'
where x.round_id = r.id and r.kind = 'shoot' and r.number = 1 and x.kind = 'fix';

-- Shoot 1 keeps the drive, the day options and the listing photo. Its cards are gone.
update rounds r set config = (r.config - 'cards' - 'lede' - 'intro') || jsonb_build_object(
    'cards', '[]'::jsonb,
    'lede', 'Ten minutes in the car, a photo or two, and pick a day. We do the rest.',
    'intro', '',
    'references', coalesce(r.config->'references', '[]'::jsonb)
  )
where r.kind = 'shoot' and r.number = 1 and jsonb_array_length(coalesce(r.config->'cards', '[]'::jsonb)) > 0
  and exists (select 1 from rounds q where q.client_id = r.client_id and q.kind = 'questionnaire');
