import { supabaseAdmin } from "./supabase-admin";
import { getClientById, getAnswers, getRecordings, listRounds, getAsks } from "./db";

const MODEL = "claude-sonnet-4-5";

/**
 * Writes the first draft of the brand brief from the card verdicts and every transcript we have.
 * Akshay edits this; he does not start from a blank page.
 */
export async function generateBrief(clientId: string): Promise<string> {
  const client = await getClientById(clientId);
  if (!client) throw new Error("client not found");
  const [answers, recordings, rounds, asks] = await Promise.all([getAnswers(clientId), getRecordings(clientId), listRounds(clientId), getAsks(clientId)]);

  const roundBlocks = rounds.slice().reverse().map((rd) => {
    const cardLines = rd.config.cards.map((c) => {
      const a = answers.find((x) => x.card_id === c.id && x.round_id === rd.id);
      const v = !a ? "not answered" : c.kind === "question" ? (a.verdict === "skip" ? "skipped" : `answered${a.note ? ": " + a.note : ""}`) : a.verdict === "yes" ? "THIS IS ME" : a.verdict === "no" ? `NOT QUITE${a.note ? ": " + a.note : ""}` : "DO NOT USE";
      const fix = a?.recording_id ? recordings.find((r) => r.id === a.recording_id) : null;
      return `- "${c.claim}" → ${v}${fix?.transcript ? `\n  ${c.kind === "question" ? "His answer" : "Voice note on this card"}: ${fix.transcript}` : ""}`;
    });
    const drive = recordings.filter((r) => r.kind === "drive" && r.round_id === rd.id && r.transcript).map((r) => r.transcript).join("\n\n");
    return `ROUND ${rd.number}: ${rd.title}${rd.shoot_date ? ` (shoot day ${rd.shoot_date})` : ""}\nCards:\n${cardLines.join("\n")}\nDrive prompts: ${rd.config.prompts.map((p) => p.q).join(" / ") || "none"}\nDrive transcript:\n${drive || "(none yet)"}`;
  });
  const askLines = asks.filter((a) => a.status === "answered").map((a) => { const rec = a.recording_id ? recordings.find((r) => r.id === a.recording_id) : null; return `Q: ${a.question}\nA: ${a.answer_text || ""}${rec?.transcript ? (a.answer_text ? " / voice: " : "") + rec.transcript : ""}`; });
  const otherVoice = askLines.join("\n\n");

  const system = `You write internal brand briefs for NAMELESS, a personal brand advisory in Melbourne. You write in plain, direct English. Short sentences. No em dashes, no exclamation marks, no emoji, no buzzwords, no "not X but Y" constructions, no hollow praise. Never invent facts: if the material does not say it, you do not say it. Quote the client's own phrases where they are useful, in the language mix he used. The reader is Akshay, the strategist who will refine this, so write for someone who knows the client.`;

  const user = `Client: ${client.name}${client.config.area ? ", " + client.config.area : ""}.

${roundBlocks.join("\n\n")}

${otherVoice ? "FOLLOW-UP QUESTIONS AND HIS ANSWERS:\n" + otherVoice + "\n\n" : ""}Write the brand brief draft with these sections, as markdown headings:
1. Positioning in one line
2. Who he is for
3. The story (turning point, in his words where possible)
4. Proof and the difficult deal
5. How he talks (phrases he actually uses, language mix, words to avoid)
6. On camera (comfort, formats that fit)
7. Off limits
8. Two content pillars, with three example post ideas under each
9. Open questions for Akshay to ask on the call

Keep it under 900 words. Where a section has no material yet, write one line saying what is missing instead of guessing.`;

  const { text, model } = await write(system, user);
  await supabaseAdmin().from("briefs").insert({ client_id: clientId, content: text, model });
  return text;
}

/** Claude when an Anthropic key is set, otherwise OpenAI. Same prompt either way. */
async function write(system: string, user: string): Promise<{ text: string; model: string }> {
  const anthropic = process.env.ANTHROPIC_API_KEY;
  if (anthropic) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": anthropic, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 2000, system, messages: [{ role: "user", content: user }] }),
    });
    if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const j = (await r.json()) as { content: { type: string; text?: string }[] };
    return { text: j.content.filter((c) => c.type === "text").map((c) => c.text || "").join("\n").trim(), model: MODEL };
  }
  const openai = process.env.OPENAI_API_KEY;
  if (!openai) throw new Error("Set ANTHROPIC_API_KEY or OPENAI_API_KEY");
  const model = "gpt-4.1";
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openai}`, "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 2000, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = (await r.json()) as { choices: { message: { content: string } }[] };
  return { text: (j.choices[0]?.message?.content || "").trim(), model };
}
