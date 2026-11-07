import { getClientById, getAnswers, getRecordings, listRounds, getBriefs, getAsks } from "./db";
import type { RoundConfig } from "./types";
import { followUpRound, defaultShoot1 } from "./templates";

const MODEL = "claude-sonnet-4-5";

/**
 * Drafts the next shoot's questionnaire from everything we already have on the client:
 * previous cards and verdicts, transcripts, the brief, his answers to our questions.
 * Confirm, don't compose: the cards are statements he taps, not questions he writes.
 */
export async function draftNextShoot(clientId: string, shootNumber: number): Promise<RoundConfig> {
  const client = await getClientById(clientId);
  if (!client) throw new Error("client not found");
  const [answers, recordings, rounds, briefs, asks] = await Promise.all([getAnswers(clientId), getRecordings(clientId), listRounds(clientId), getBriefs(clientId), getAsks(clientId)]);

  const history = rounds.filter((r) => r.kind === "questionnaire" || r.number < shootNumber).map((r) => {
    const lines = r.config.cards.map((c) => {
      const a = answers.find((x) => x.card_id === c.id && x.round_id === r.id);
      const fix = a?.recording_id ? recordings.find((x) => x.id === a.recording_id) : null;
      return `- "${c.claim}" → ${!a ? "not answered" : a.verdict === "yes" ? "THIS IS ME" : a.verdict === "no" ? "NOT QUITE" + (a.note ? ": " + a.note : "") : "DO NOT USE"}${fix?.transcript ? " / voice: " + fix.transcript : ""}`;
    });
    const drive = recordings.filter((x) => x.kind === "drive" && x.round_id === r.id && x.transcript).map((x) => x.transcript).join("\n");
    return `${r.kind === "questionnaire" ? "ONBOARDING QUESTIONNAIRE" : `SHOOT ${r.number}`}${r.plan?.date ? " (" + r.plan.date + ")" : ""}\n${lines.join("\n") || "(no cards)"}\nDrive transcript: ${drive || "(none)"}`;
  }).join("\n\n");
  const brief = briefs[0]?.edited_content || briefs[0]?.content || "";
  const qa = asks.filter((a) => a.status === "answered").map((a) => { const rec = a.recording_id ? recordings.find((x) => x.id === a.recording_id) : null; return `Q: ${a.question}\nA: ${a.answer_text}${rec?.transcript ? " / voice: " + rec.transcript : ""}`; }).join("\n");

  const system = `You write questionnaires for NAMELESS, a personal brand advisory in Melbourne. The client is a busy real estate agent who hates forms. Each card is either a one-line statement in plain English (under 22 words) he taps "This is me" or "Not quite" on, or a question (kind "question") he answers with his voice, under 18 words. The first card is always a question about his day in the week of the shoot. Never ask him to write. No em dashes, no exclamation marks, no emoji, no buzzwords, no "not X but Y". Use only facts in the material; where you need something new, phrase it as a specific statement he can confirm or correct, never a vague question. Output JSON only.`;

  const user = `Client: ${client.name}${client.config.area ? ", " + client.config.area : ""}.
We are planning SHOOT ${shootNumber}. Write its questionnaire.

WHAT WE KNOW
${history || "(nothing yet)"}

BRIEF
${brief || "(none)"}

${qa ? "HIS ANSWERS TO OUR QUESTIONS\n" + qa + "\n" : ""}
Return JSON with exactly this shape:
{
  "lede": "one line under his name, max 25 words, tells him this is for shoot ${shootNumber} and how long it takes",
  "intro": "one line above the cards, max 20 words",
  "cards": [ { "id": "kebab-id", "kind": "question" | "claim", "claim": "the question or the statement", "why": "small line under it, max 14 words" } ],   // shoot 1: 0 to 3 (the drive carries it). Shoot 2 and 3: 4 to 8, what we plan to film, who is on camera, where, what changed, what he wants more or less of
  "prompts": [ { "q": "drive prompt, max 10 words", "h": "nudge, max 20 words" } ],   // shoot 1: 5 to 8 story prompts for one continuous recording in the car. Shoot 2 and 3: [] unless a story is still missing, the questions go in the cards
  "photoAsks": [ "A photo of ..." ]   // 1 to 3 things we need to see before the shoot
}`;

  const key = process.env.ANTHROPIC_API_KEY;
  let text = "";
  if (key) {
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model: MODEL, max_tokens: 2500, system, messages: [{ role: "user", content: user }] }) });
    if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const j = (await r.json()) as { content: { type: string; text?: string }[] };
    text = j.content.filter((c) => c.type === "text").map((c) => c.text || "").join("\n");
  } else {
    const openai = process.env.OPENAI_API_KEY;
    if (!openai) throw new Error("No ANTHROPIC_API_KEY or OPENAI_API_KEY");
    const r = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${openai}`, "content-type": "application/json" }, body: JSON.stringify({ model: "gpt-4.1", max_tokens: 2500, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: user }] }) });
    if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const j = (await r.json()) as { choices: { message: { content: string } }[] };
    text = j.choices[0]?.message?.content || "";
  }

  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  let parsed: Partial<RoundConfig>;
  try { parsed = JSON.parse(json); } catch { throw new Error("The draft came back malformed. Try again."); }
  const cards = (Array.isArray(parsed.cards) ? parsed.cards : []).map((c, i) => ({ id: String(c.id || `card-${i + 1}`).toLowerCase().replace(/[^a-z0-9-]/g, "-"), claim: String(c.claim || "").trim(), why: String(c.why || "").trim(), kind: c.kind === "question" ? ("question" as const) : undefined })).filter((c) => c.claim);
  const prompts = (Array.isArray(parsed.prompts) ? parsed.prompts : []).map((p) => ({ q: String(p.q || "").trim(), h: String(p.h || "").trim() })).filter((p) => p.q);
  if (cards.length + prompts.length < 3) throw new Error("The draft came back too thin. Try again.");
  const base = shootNumber === 1 ? defaultShoot1 : followUpRound;
  return {
    ...base,
    lede: String(parsed.lede || base.lede),
    intro: String(parsed.intro || base.intro),
    cards,
    prompts,
    photoAsks: (Array.isArray(parsed.photoAsks) ? parsed.photoAsks : base.photoAsks).map(String).filter(Boolean),
    shootOptions: [],
    references: [],
  };
}
