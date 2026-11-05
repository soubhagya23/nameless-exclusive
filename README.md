# nameless-exclusive

The NAMELESS client onboarding system.

- `exclusive.thenameless.studio/<slug>`: the client's private page. Twelve cards about his story (That is me / Not quite / Do not use), a drive-and-talk recording with auto-advancing prompts, shoot day picks. Everything saves the moment it happens.
- `hq.thenameless.studio`: ours. Magic-link login for the team. Every client, every answer, every recording with its transcript, and a Claude-written first draft of the brand brief for Akshay to edit.

Stack: Next.js 15, Supabase (Postgres, Storage, Auth), Vercel. Transcription by OpenAI (`gpt-4o-transcribe`, falls back to `whisper-1`). Briefs by Anthropic (`claude-sonnet-4-5`).

See `SETUP.md` for the one-time setup and `supabase/schema.sql` for the database.

## How it fits together

```
client page  --card tap-->   POST /api/c/[slug]/card        -> card_answers (upsert)
             --record-->     POST /api/c/[slug]/upload-url  -> recordings row + signed upload URL
             --upload-->     Supabase Storage (private bucket "recordings")
             --done-->       POST /api/c/[slug]/recording   -> duration saved, transcription runs after the response
HQ           --login-->      Supabase Auth magic link, allow-listed emails only
             --listen-->     GET /api/hq/audio/[id]         -> short-lived signed URL
             --brief-->      server action -> Anthropic -> briefs row
```

Per-client content (cards, prompts, shoot options, portrait, WhatsApp number) lives in the `clients` row, editable in HQ. Templates for new clients are in `src/lib/templates.ts`.
