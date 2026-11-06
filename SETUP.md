# Setup checklist

Everything below is a one-time job. About twenty minutes. Do it in order.

## 1. Supabase (database, storage, HQ login)

1. supabase.com → New project. Name `nameless`, region Sydney. Save the database password somewhere safe (you will not need it day to day).
2. When it is ready: **SQL Editor → New query**. Open `supabase/schema.sql` from this repo, paste everything, **Run**. Then do the same with every file in `supabase/migrations/`, in number order (002, 003, 004, 005). Together they create the tables, the rounds model and the private `recordings` bucket.
3. **Authentication → URL Configuration**:
   - Site URL: `https://hq.thenameless.studio`
   - Redirect URLs, add both: `https://hq.thenameless.studio/auth/callback` and `https://*.vercel.app/auth/callback`
4. **Authentication → Providers → Email**: leave Email enabled. Turn **off** "Confirm email" is not needed; magic links work as is.
5. **Project Settings → API Keys**. Keep this tab open. You need three values: the Project URL, the **Publishable key** (`sb_publishable_…`) and the **Secret key** (`sb_secret_…`, eye icon reveals it). Older projects show these as `anon` and `service_role`; same thing.

## 2. Keys

- OpenAI: platform.openai.com → API keys → Create. Used for transcription only.
- Anthropic (optional): console.anthropic.com → API keys → Create. Used for the brief drafts. Without it, OpenAI writes the briefs too.

Put a small amount of credit on each. A full handshake costs well under a dollar.

## 3. Vercel (hosting)

1. vercel.com → Add New → Project → Import `soubhagya23/nameless-exclusive`. Framework: Next.js (auto). Leave build settings alone.
2. Before you press Deploy, open **Environment Variables** and add each of these. Paste the value, no quotes.

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Publishable key (`sb_publishable_…`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Secret key (`sb_secret_…`, keep it secret) |
| `OPENAI_API_KEY` | your OpenAI key |
| `ANTHROPIC_API_KEY` | your Anthropic key (optional, leave out if you only have OpenAI) |
| `HQ_ALLOWED_EMAILS` | `hello@thenameless.studio,ranjansoubhagya.master@gmail.com` plus Akshay's email, comma separated, no spaces |
| `CLIENT_HOST` | `exclusive.thenameless.studio` |
| `HQ_HOST` | `hq.thenameless.studio` |
| `INTERNAL_SECRET` | any long random string |

3. Deploy. First build takes about two minutes.
4. **Project → Settings → Domains**. Add `exclusive.thenameless.studio` and `hq.thenameless.studio`. Vercel shows the DNS record it wants for each (a CNAME to `cname.vercel-dns.com`).

## 4. Hostinger DNS

hPanel → Domains → thenameless.studio → DNS / Name Servers. Add two records:

| Type | Name | Points to | TTL |
|---|---|---|---|
| CNAME | `exclusive` | `cname.vercel-dns.com` | default |
| CNAME | `hq` | `cname.vercel-dns.com` | default |

Nothing else changes. The main site stays on Hostinger exactly as it is. DNS usually resolves within minutes; Vercel issues the SSL certificates itself.

## 5. First run

1. Open `https://hq.thenameless.studio`. Enter your email, open the link from the email on the same device. You are in.
2. **New client** → use the "Jatin's set" link at the top. Check the cards, press Create. His page is live at `https://exclusive.thenameless.studio/jatin`.
3. Open his page on your phone, tap a few cards, record a short drive. Within a minute HQ shows the transcript. Press "Write the first draft" to see the brief.
4. Wipe your test: in Supabase → Table Editor, delete the rows in `card_answers`, `recordings` and `briefs` for Jatin, and the files under `recordings/jatin/` in Storage. Or just create Jatin again with a fresh slug.

## Day to day

- New client: HQ → New client → edit the shoot 1 cards for the person → Create. Nothing reaches him yet.
- Send: on his HQ page, Shoot 1 → **Send to him**. Then **Copy the WhatsApp** and paste it to him. His page is live.
- He taps cards, records the drive, sends photos, picks days. It all lands in HQ as it happens; the Activity panel shows when he was last on.
- Need more from him: **Ask him something**. It appears on his page under "From Akshay".
- Plan the shoot: fill the **Shoot plan** form (date, call time, where, run of day, wear, bring, day-before checklist) → **Send plan to his page**. He taps Works for me; the day before, he ticks the list.
- Next shoot: **New shoot** → "Draft with AI from what we know" → read it, edit, **Send to him**. The same link shows him shoot 2.
- Quiet client: his tile turns amber after 48 hours with nothing answered, with a one-tap nudge to paste.
- Starting over after a test: **Reset everything** on his HQ page.

## Local development

```
cp .env.example .env.local   # fill in the same values
npm install
npm run dev                  # http://localhost:3000/hq and /c/jatin
```
